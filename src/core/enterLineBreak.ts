/**
 * MathType-style Enter → new row in the mathfield.
 * Uses MathLive `addRowAfter` (splits at caret; wraps bare formulas in
 * `\displaylines{…}`). We rewrite that wrapper to `gathered` so
 * Format → Align can unwrap / rewrap consistently.
 */

import type { MathfieldElement } from "mathlive";

const DISPLAYLINES_RE = /^\\displaylines\{([\s\S]*)\}$/;

/** Convert MathLive's `\displaylines{body}` → `\begin{gathered}body\end{gathered}`. */
export function displaylinesToGathered(latex: string): string | null {
  const trimmed = latex.trim();
  const match = DISPLAYLINES_RE.exec(trimmed);
  if (!match) return null;
  return `\\begin{gathered}${match[1]}\\end{gathered}`;
}

/**
 * Insert a line break at the caret.
 * Returns true when Enter was handled (caller should preventDefault).
 */
export function insertMathLineBreak(field: MathfieldElement): boolean {
  // Latex autocomplete mode: leave Enter to MathLive (`complete`).
  if (field.mode === "latex") return false;

  const before = field.getValue("latex");
  const pos = field.position;
  const ok = field.executeCommand("addRowAfter");
  if (!ok) return false;

  const after = field.getValue("latex");
  const gathered = displaylinesToGathered(after);
  if (gathered && gathered !== after) {
    field.setValue(gathered);
    try {
      const max = field.lastOffset;
      field.position = Math.min(Math.max(0, pos + 1), max);
    } catch {
      /* ignore caret restore failures */
    }
  } else if (after === before) {
    // Empty field: seed a gathered template with two rows.
    field.setValue("\\begin{gathered}#?\\\\#?\\end{gathered}");
    try {
      field.executeCommand("moveToNextPlaceholder");
    } catch {
      /* ignore */
    }
  }
  return true;
}

/** True when Enter should be ignored (IME composition / Android confirm). */
export function shouldIgnoreEnterForIme(event: KeyboardEvent): boolean {
  if (event.isComposing) return true;
  // Legacy IME keyCode while composing (Android / some desktop IMEs).
  if (event.keyCode === 229) return true;
  return false;
}
