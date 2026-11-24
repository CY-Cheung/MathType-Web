/**
 * MathType-style Enter → new row in the mathfield.
 *
 * MathLive's default bare Enter only fires a `change` event unless the caret
 * is already inside a multiline environment. We intercept Enter in the
 * capture phase (and bind Enter → addRowAfter) so a single-line formula
 * wraps into `gathered` with a break at the caret.
 */

import type { MathfieldElement } from "mathlive";

const DISPLAYLINES_RE = /^\\displaylines\{([\s\S]*)\}$/;

const OUTER_MULTILINE_RE =
  /^\\begin\{(gathered|aligned|flalign\*|align\*?|eqnarray\*?)\}/;

/** True when the whole formula is already an outer multiline env. */
export function isOuterMultilineLatex(latex: string): boolean {
  const t = latex.trim();
  if (!t) return false;
  if (DISPLAYLINES_RE.test(t)) return true;
  return OUTER_MULTILINE_RE.test(t);
}

/** Convert MathLive `\displaylines{body}` → `\begin{gathered}body\end{gathered}`. */
export function displaylinesToGathered(latex: string): string | null {
  const match = DISPLAYLINES_RE.exec(latex.trim());
  if (!match) return null;
  return `\\begin{gathered}${match[1]}\\end{gathered}`;
}

/**
 * True when addRowAfter grew a matrix/array rather than wrapping the whole
 * formula in displaylines (caret was inside a matrix cell).
 */
export function isMatrixRowEdit(before: string, after: string): boolean {
  if (after === before) return false;
  if (DISPLAYLINES_RE.test(after.trim())) return false;
  if (
    OUTER_MULTILINE_RE.test(after.trim()) &&
    !OUTER_MULTILINE_RE.test(before.trim())
  ) {
    return false;
  }
  const matrixEnv = /\\begin\{((?:p|b|v|V|B)?matrix|array)\}/;
  if (!matrixEnv.test(before) || !matrixEnv.test(after)) return false;
  const rowsBefore = (before.match(/\\\\/g) ?? []).length;
  const rowsAfter = (after.match(/\\\\/g) ?? []).length;
  return rowsAfter > rowsBefore;
}

function restoreCaretNear(field: MathfieldElement, pos: number): void {
  try {
    const max = field.lastOffset;
    field.position = Math.min(Math.max(0, pos), max);
  } catch {
    /* ignore */
  }
}

/**
 * Insert a line break at the caret.
 * Returns true when Enter was handled (caller should preventDefault).
 */
export function insertMathLineBreak(field: MathfieldElement): boolean {
  // Latex autocomplete mode: leave Enter to MathLive (`complete`).
  if (field.mode === "latex") return false;

  const before = field.getValue("latex") ?? "";
  const pos = field.position;

  // Empty canvas → seed a two-row gathered template.
  if (!before.trim()) {
    field.setValue("\\begin{gathered}#?\\\\#?\\end{gathered}");
    try {
      field.executeCommand("moveToNextPlaceholder");
    } catch {
      /* ignore */
    }
    return true;
  }

  const ok = field.executeCommand("addRowAfter");
  if (!ok) return false;

  const after = field.getValue("latex") ?? "";

  // Caret inside matrix/array: MathLive added a matrix row — keep structure.
  if (isMatrixRowEdit(before, after)) {
    return true;
  }

  // Bare formula → displaylines{left\\ right}; rewrite to gathered for Align.
  const gathered = displaylinesToGathered(after);
  if (gathered && gathered !== after) {
    field.setValue(gathered);
    restoreCaretNear(field, pos + 2);
    try {
      field.executeCommand("moveToNextPlaceholder");
    } catch {
      /* placeholders may be absent when both sides have content */
    }
    return true;
  }

  // Already multiline (gathered / aligned / …): addRowAfter was enough.
  if (after !== before) return true;

  // Fallback: force a gathered wrap with a trailing empty row.
  const body = before.trim();
  field.setValue(`\\begin{gathered}${body}\\\\#?\\end{gathered}`);
  try {
    field.executeCommand("moveToNextPlaceholder");
  } catch {
    restoreCaretNear(field, field.lastOffset);
  }
  return true;
}

/** True when Enter should be ignored (IME composition / Android confirm). */
export function shouldIgnoreEnterForIme(event: KeyboardEvent): boolean {
  if (event.isComposing) return true;
  if (event.keyCode === 229) return true;
  return false;
}

/** Plain Enter (no modifiers) that we own in math mode. */
export function isPlainEnterKey(event: KeyboardEvent): boolean {
  if (event.key !== "Enter" && event.key !== "Return") return false;
  if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
    return false;
  }
  return true;
}
