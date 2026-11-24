import type { MathfieldElement } from "mathlive";
import { BACKSPACE_SENTINEL } from "./androidBackspaceBridge";
import { commitPendingComposition } from "./commitComposition";
import {
  isFunctionShortcutName,
  leadingFunctionShortcutPrefix,
  stripFunctionShortcutPrefix,
} from "./imeShortcutPrefix";

const STRIPPED_FLAG = "__mtImePrefixStripped";

function findKeyboardSink(field: MathfieldElement): HTMLElement | null {
  const sink = field.shadowRoot?.querySelector(".ML__keyboard-sink");
  return sink instanceof HTMLElement ? sink : null;
}

function hasCompositionAtom(field: MathfieldElement): boolean {
  return Boolean(field.shadowRoot?.querySelector(".ML__composition"));
}

function sinkPlainText(sink: HTMLElement): string {
  return (sink.textContent ?? "").split(BACKSPACE_SENTINEL).join("");
}

function clearSinkQuietly(sink: HTMLElement): void {
  if (sink.textContent) sink.textContent = "";
}

/**
 * Command name of the math operator immediately before the caret
 * (e.g. `"tan"` when latex ends with `\tan`). Composition atoms serialize
 * empty, so a live IME buffer does not pollute this suffix.
 */
export function functionNameBeforeCaret(field: MathfieldElement): string | null {
  try {
    const pos = field.position ?? 0;
    const before = field.getValue(0, pos, "latex") ?? "";
    const match = before.match(/\\([A-Za-z]+)\s*$/);
    if (!match) return null;
    return isFunctionShortcutName(match[1]) ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Rewrite a composed string that still carries a just-converted shortcut
 * prefix (`"tanx"` after `\tan` → `"x"`; `"tan"` → `""`).
 */
export function rewriteComposedShortcutBuffer(
  field: MathfieldElement,
  composed: string,
): string | null {
  if (!composed) return null;

  const fromCaret = functionNameBeforeCaret(field);
  const stripped = stripFunctionShortcutPrefix(composed, fromCaret);
  if (stripped !== null) return stripped;

  // Fallback: buffer clearly starts with a known shortcut and the caret
  // already sits after the matching `\<name>`.
  const lead = leadingFunctionShortcutPrefix(composed);
  if (!lead) return null;
  try {
    const pos = field.position ?? 0;
    const before = field.getValue(0, pos, "latex") ?? "";
    if (!new RegExp(`\\\\${lead}\\s*$`).test(before)) return null;
  } catch {
    return null;
  }
  return stripFunctionShortcutPrefix(composed, lead);
}

/**
 * Android Samsung Keyboard + MathLive inlineShortcuts (`tan` → `\tan`, …)
 * often leave the shortcut letters in the IME buffer. A later
 * `compositionend` may then submit `"tanx"` while the caret is already after
 * `\tan`, producing `\tan tanx`.
 *
 * Listen on `shadowRoot` (capture) so we run *before* MathLive's sink handler
 * even for non-`composed` events inside the shadow tree. Rewrite the payload
 * (prefix strip) and re-dispatch so only the remainder is inserted.
 * Live composition is never force-committed (keeps letters like `d` visible).
 */
export function attachImeCompositionGuard(field: MathfieldElement): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  let lastCompositionData = "";
  let suppressUntil = 0;
  let lastCompositionActivity = 0;
  let composing = false;
  let sink: HTMLElement | null = null;

  const bindSink = (el: HTMLElement) => {
    if (sink === el) return;
    sink = el;

    el.addEventListener(
      "compositionstart",
      () => {
        composing = true;
        lastCompositionActivity = performance.now();
      },
      { capture: true, signal },
    );

    el.addEventListener(
      "compositionupdate",
      () => {
        composing = true;
        lastCompositionActivity = performance.now();
      },
      { capture: true, signal },
    );

    el.addEventListener(
      "compositionend",
      (event: CompositionEvent) => {
        composing = false;
        lastCompositionData = event.data ?? "";
        lastCompositionActivity = performance.now();
        if (lastCompositionData) {
          suppressUntil = performance.now() + 220;
        }
        queueMicrotask(() => clearSinkQuietly(el));
        window.setTimeout(() => clearSinkQuietly(el), 0);
      },
      { capture: true, signal },
    );

    el.addEventListener(
      "input",
      (event: Event) => {
        if (performance.now() > suppressUntil) return;
        if (composing) return;
        const data = event instanceof InputEvent ? (event.data ?? "") : "";
        if (!data) return;

        if (lastCompositionData && data === lastCompositionData) {
          event.preventDefault();
          event.stopImmediatePropagation();
          clearSinkQuietly(el);
          return;
        }

        const rewritten = rewriteComposedShortcutBuffer(field, data);
        if (rewritten === null) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        clearSinkQuietly(el);
        if (rewritten) {
          try {
            field.executeCommand(["typedText", rewritten]);
          } catch {
            /* typedText may be unavailable on some builds */
          }
        }
      },
      { capture: true, signal },
    );
  };

  const ensureSink = () => {
    const el = findKeyboardSink(field);
    if (el) bindSink(el);
  };

  ensureSink();

  const root = field.shadowRoot;
  if (!root) {
    return () => {
      controller.abort();
    };
  }

  const observer = new MutationObserver(() => {
    ensureSink();
  });
  observer.observe(root, { childList: true, subtree: true });

  /**
   * shadowRoot capture runs before MathLive's sink `compositionend` handler.
   * Rewrite `"tanx"` → `"x"` (or `"tan"` → `""`) and re-dispatch.
   */
  root.addEventListener(
    "compositionend",
    (event: Event) => {
      if (!(event instanceof CompositionEvent)) return;
      if ((event as CompositionEvent & { [STRIPPED_FLAG]?: boolean })[STRIPPED_FLAG]) {
        return;
      }

      const data = event.data ?? "";
      const rewritten = rewriteComposedShortcutBuffer(field, data);
      if (rewritten === null || rewritten === data) return;

      // Block MathLive from seeing the raw buffer; feed the stripped data instead.
      event.stopPropagation();
      event.stopImmediatePropagation();
      composing = false;
      lastCompositionActivity = performance.now();

      const el = findKeyboardSink(field);
      if (!el) return;

      const next = new CompositionEvent("compositionend", {
        bubbles: true,
        cancelable: true,
        composed: true,
        data: rewritten,
      });
      Object.defineProperty(next, STRIPPED_FLAG, { value: true });
      el.dispatchEvent(next);
    },
    { capture: true, signal },
  );

  const safeCommitStuckComposition = () => {
    if (composing) return;

    const atom = hasCompositionAtom(field);
    const el = findKeyboardSink(field);
    const residual = el ? sinkPlainText(el).trim() : "";
    if (!atom && !residual) return;

    if (performance.now() - lastCompositionActivity < 280) return;

    commitPendingComposition(field);
    if (el) clearSinkQuietly(el);
    composing = false;
  };

  field.addEventListener(
    "pointerdown",
    () => {
      queueMicrotask(safeCommitStuckComposition);
    },
    { signal },
  );

  field.addEventListener(
    "selection-change",
    () => {
      queueMicrotask(safeCommitStuckComposition);
    },
    { signal },
  );

  field.addEventListener(
    "focusout",
    () => {
      window.setTimeout(safeCommitStuckComposition, 300);
    },
    { signal },
  );

  return () => {
    controller.abort();
    observer.disconnect();
  };
}
