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
 * Light IME hygiene for Android / Samsung Keyboard:
 * - clear residual sink text after composition ends
 * - dismiss a *stuck* brown composition atom when the IME is idle
 *
 * Does **not** intercept `compositionend` (uncancellable on Android Chrome)
 * and does **not** force-commit during a live composition (that hid letters).
 * Letter-function duplicate (`\tan tanx`) is prevented by disabling those
 * MathLive `inlineShortcuts` on Android — see `androidFnShortcuts.ts`.
 */
export function attachImeCompositionGuard(field: MathfieldElement): () => void {
  const controller = new AbortController();
  const { signal } = controller;
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
      () => {
        composing = false;
        lastCompositionActivity = performance.now();
        queueMicrotask(() => clearSinkQuietly(el));
        window.setTimeout(() => clearSinkQuietly(el), 0);
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
    observer?.disconnect();
  };
}
