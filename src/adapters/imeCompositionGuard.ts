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
 * Also force-commits a stuck composition when the caret moves / canvas is
 * tapped — without touching toolbar inserts (those already call
 * `commitPendingComposition` via `insertAdaptedLatex`).
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
        // Block a follow-up `input` that re-inserts the same composed string.
        suppressUntil = performance.now() + 180;
        queueMicrotask(() => clearSinkQuietly(el));
        window.setTimeout(() => clearSinkQuietly(el), 0);
      },
      { capture: true, signal },
    );

    el.addEventListener(
      "input",
      (event: Event) => {
        if (performance.now() > suppressUntil) return;
        const data = event instanceof InputEvent ? (event.data ?? "") : "";
        if (!data || !lastCompositionData) return;
        // Same buffer, or IME appending onto leftover composition text.
        if (
          data === lastCompositionData ||
          data.startsWith(lastCompositionData) ||
          lastCompositionData.startsWith(data)
        ) {
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

  const safeCommitStuckComposition = (force = false) => {
    const atom = hasCompositionAtom(field);
    const el = findKeyboardSink(field);
    const residual = el ? sinkPlainText(el).trim() : "";
    if (!atom && !residual) return;

    // Do not interrupt a live IME session (compositionupdate within 120ms)
    // unless the user explicitly tapped the canvas (`force`).
    const recent = performance.now() - lastCompositionActivity < 120;
    if (!force && composing && recent) return;

    commitPendingComposition(field);
    if (el) clearSinkQuietly(el);
    composing = false;
  };

  // Tap on canvas — dismiss stuck brown composition (toolbar inserts use
  // insertAdaptedLatex → commitPendingComposition separately).
  field.addEventListener(
    "pointerdown",
    () => {
      queueMicrotask(() => safeCommitStuckComposition(true));
    },
    { signal },
  );

  field.addEventListener(
    "selection-change",
    () => {
      queueMicrotask(() => safeCommitStuckComposition(false));
    },
    { signal },
  );

  field.addEventListener(
    "focusout",
    () => {
      queueMicrotask(() => safeCommitStuckComposition(true));
    },
    { signal },
  );

  return () => {
    controller.abort();
    observer?.disconnect();
  };
}
