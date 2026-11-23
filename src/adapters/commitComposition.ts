import type { MathfieldElement } from "mathlive";
import { BACKSPACE_SENTINEL } from "./androidBackspaceBridge";

function findKeyboardSink(field: MathfieldElement): HTMLElement | null {
  const sink = field.shadowRoot?.querySelector(".ML__keyboard-sink");
  return sink instanceof HTMLElement ? sink : null;
}

/**
 * Force-commit any in-progress Android / OS IME composition on the MathLive
 * keyboard-sink before a toolbar / shortcut command runs.
 *
 * Samsung Keyboard leaves a brown composition highlight; clicking a toolbar
 * button mid-composition otherwise stalls the IME and the new placeholder
 * never receives focus.
 */
export function commitPendingComposition(field: MathfieldElement): void {
  const sink = findKeyboardSink(field);
  if (!sink) return;

  const raw = sink.textContent ?? "";
  const data = raw.split(BACKSPACE_SENTINEL).join("");

  // Always emit compositionend so MathLive clears compositionInProgress even
  // if the sink only held the ZWSP sentinel.
  try {
    sink.dispatchEvent(
      new CompositionEvent("compositionend", {
        bubbles: true,
        cancelable: true,
        data,
      }),
    );
  } catch {
    /* older engines */
  }

  // Drop residual sink text (MathLive also clears on compositionend).
  if (sink.textContent) sink.textContent = "";
}
