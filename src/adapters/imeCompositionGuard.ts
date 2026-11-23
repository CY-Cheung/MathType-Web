import type { MathfieldElement } from "mathlive";
import { BACKSPACE_SENTINEL } from "./androidBackspaceBridge";
import { commitPendingComposition } from "./commitComposition";

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
 * Android Samsung Keyboard + MathLive inlineShortcuts (`tan` → `\tan`, …)
 * often leave residual sink text after `compositionend`. The next key then
 * re-inserts the buffered string (`tan tanx`, `sec sec`).
 *
 * Stuck brown composition is dismissed only when the IME session is idle —
 * never mid-`compositionupdate`, so typed letters stay visible.
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
        // Only suppress an exact duplicate re-insert of the finished string
        // (tan/sec shortcut leftovers) — do not match prefixes/substrings.
        if (lastCompositionData) {
          suppressUntil = performance.now() + 180;
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
        if (!data || !lastCompositionData) return;
        // Exact leftover re-insert only (e.g. full "tan" after `\tan` shortcut).
        if (data === lastCompositionData) {
          event.preventDefault();
          event.stopImmediatePropagation();
          clearSinkQuietly(el);
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
  const observer =
    root &&
    new MutationObserver(() => {
      ensureSink();
    });
  observer?.observe(root!, { childList: true, subtree: true });

  /**
   * Commit only a *stuck* composition (atom / residual after IME went idle).
   * Never interrupt a live composition session — that hid letters like `d`
   * until compositionend finally flushed `dy`.
   */
  const safeCommitStuckComposition = () => {
    if (composing) return;

    const atom = hasCompositionAtom(field);
    const el = findKeyboardSink(field);
    const residual = el ? sinkPlainText(el).trim() : "";
    if (!atom && !residual) return;

    // Require a short idle window so a just-ended update is not treated as stuck.
    if (performance.now() - lastCompositionActivity < 280) return;

    commitPendingComposition(field);
    if (el) clearSinkQuietly(el);
    composing = false;
  };

  // Canvas tap / caret move / blur — dismiss stuck state only (not live IME).
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
      // Leaving the field: allow a slightly longer wait then commit.
      window.setTimeout(safeCommitStuckComposition, 300);
    },
    { signal },
  );

  return () => {
    controller.abort();
    observer?.disconnect();
  };
}
