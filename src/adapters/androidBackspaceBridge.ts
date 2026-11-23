import type { MathfieldElement } from "mathlive";

/** Zero-width space — invisible, keeps Samsung/Gboard willing to emit Backspace. */
export const BACKSPACE_SENTINEL = "\u200B";

const DELETE_BACKWARD_TYPES = new Set([
  "deleteContentBackward",
  "deleteWordBackward",
  "deleteSoftLineBackward",
  "deleteHardLineBackward",
  "deleteEntireSoftLine",
]);

/** Coarse pointer / touch — skip on mouse-only desktop to avoid double-delete. */
export function shouldEnableAndroidBackspaceBridge(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (navigator.maxTouchPoints > 0) return true;
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

function findKeyboardSink(field: MathfieldElement): HTMLElement | null {
  const sink = field.shadowRoot?.querySelector(".ML__keyboard-sink");
  return sink instanceof HTMLElement ? sink : null;
}

function getShadowSelection(sink: HTMLElement): Selection | null {
  const root = sink.getRootNode();
  if (root instanceof ShadowRoot) {
    const withSel = root as ShadowRoot & { getSelection?: () => Selection | null };
    if (typeof withSel.getSelection === "function") {
      return withSel.getSelection();
    }
  }
  return window.getSelection();
}

/** Place ZWSP in the sink and put the caret after it (index 1). */
export function placeBackspaceSentinel(
  sink: HTMLElement,
  options?: { writingGuard?: { value: boolean } },
): void {
  const guard = options?.writingGuard;
  if (guard) guard.value = true;
  try {
    if (sink.textContent !== BACKSPACE_SENTINEL) {
      sink.textContent = BACKSPACE_SENTINEL;
    }
    const text = sink.firstChild;
    if (!(text instanceof Text)) return;
    const range = document.createRange();
    range.setStart(text, Math.min(1, text.length));
    range.collapse(true);
    const selection = getShadowSelection(sink);
    selection?.removeAllRanges();
    selection?.addRange(range);
  } finally {
    if (guard) {
      // Defer clear so any sync `input` from textContent settles under the guard.
      queueMicrotask(() => {
        guard.value = false;
      });
    }
  }
}

function clearSinkQuietly(sink: HTMLElement, writingGuard: { value: boolean }): void {
  writingGuard.value = true;
  try {
    if (sink.textContent) sink.textContent = "";
  } finally {
    queueMicrotask(() => {
      writingGuard.value = false;
    });
  }
}

/**
 * Android / touch: keep a ZWSP sentinel in MathLive's empty keyboard-sink so
 * the OS IME still fires Backspace / `deleteContentBackward` after composition
 * ends. Forward those deletes to `deleteBackward`, never into the formula as text.
 *
 * No-op on mouse-only desktops (physical Backspace already goes through MathLive
 * keydown). When both keydown and beforeinput fire (touch laptop), keydown wins
 * once — beforeinput only restores the sentinel.
 */
export function attachAndroidBackspaceBridge(field: MathfieldElement): () => void {
  if (!shouldEnableAndroidBackspaceBridge()) return () => {};

  const writingGuard = { value: false };
  let composing = false;
  let keydownHandledDelete = false;
  let sink: HTMLElement | null = null;
  let sinkAbort: AbortController | null = null;
  let cancelled = false;

  const ensureSentinel = () => {
    if (cancelled || composing) return;
    const el = findKeyboardSink(field);
    if (!el) return;
    placeBackspaceSentinel(el, { writingGuard });
  };

  const bindSink = (el: HTMLElement) => {
    if (sink === el) return;
    sinkAbort?.abort();
    sinkAbort = new AbortController();
    const { signal } = sinkAbort;
    sink = el;

    el.addEventListener(
      "compositionstart",
      () => {
        composing = true;
        // Let IME own the sink; do not keep the sentinel during composition.
        clearSinkQuietly(el, writingGuard);
      },
      { capture: true, signal },
    );
    el.addEventListener(
      "compositionend",
      () => {
        composing = false;
        // MathLive clears the sink on compositionend — restore sentinel after.
        queueMicrotask(ensureSentinel);
      },
      { capture: true, signal },
    );

    el.addEventListener(
      "keydown",
      (event) => {
        if (composing) return;
        if (event.key !== "Backspace" && event.key !== "Delete") return;
        // MathLive's capture handler already ran / will run and delete once.
        keydownHandledDelete = true;
        queueMicrotask(() => {
          keydownHandledDelete = false;
          ensureSentinel();
        });
      },
      // Bubble: after MathLive's capture keydown + deleteBackward.
      { capture: false, signal },
    );

    el.addEventListener(
      "beforeinput",
      (event) => {
        if (!(event instanceof InputEvent)) return;
        if (composing || writingGuard.value) return;

        const type = event.inputType;
        if (!DELETE_BACKWARD_TYPES.has(type) && type !== "deleteContentForward") {
          return;
        }

        // Stop the browser from mutating the sink; we own sentinel + MathLive delete.
        event.preventDefault();
        event.stopPropagation();

        if (!keydownHandledDelete) {
          if (type === "deleteContentForward") {
            field.executeCommand("deleteForward");
          } else {
            field.executeCommand("deleteBackward");
          }
        }
        ensureSentinel();
      },
      { capture: true, signal },
    );

    // Swallow programmatic sentinel writes so MathLive's `input` handler never
    // sees `\u200B` as insertText (would pollute the formula).
    el.addEventListener(
      "input",
      (event) => {
        if (!writingGuard.value) return;
        event.stopImmediatePropagation();
        event.preventDefault();
      },
      { capture: true, signal },
    );

    el.addEventListener(
      "input",
      () => {
        if (composing || writingGuard.value) return;
        // After MathLive clears the sink on insert, put the sentinel back.
        queueMicrotask(ensureSentinel);
      },
      { capture: false, signal },
    );

    if (!composing) ensureSentinel();
  };

  const attachIfReady = () => {
    if (cancelled) return;
    const el = findKeyboardSink(field);
    if (el) bindSink(el);
  };

  attachIfReady();

  const root = field.shadowRoot;
  let treeObserver: MutationObserver | null = null;
  if (root) {
    treeObserver = new MutationObserver(() => {
      if (cancelled) return;
      attachIfReady();
      if (!composing) ensureSentinel();
    });
    treeObserver.observe(root, { childList: true, subtree: true });
  }

  const onFocusIn = () => {
    if (!composing) queueMicrotask(ensureSentinel);
  };
  field.addEventListener("focusin", onFocusIn);

  return () => {
    cancelled = true;
    treeObserver?.disconnect();
    sinkAbort?.abort();
    field.removeEventListener("focusin", onFocusIn);
    sink = null;
  };
}
