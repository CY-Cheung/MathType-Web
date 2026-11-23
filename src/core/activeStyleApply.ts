/**
 * Apply MathType Active Style to a MathLive mathfield
 * (mode switch + insertion style + optional selection wrap).
 */

import type { MathfieldElement, Style } from "mathlive";
import {
  ACTIVE_STYLE_CLASS,
  mathLiveStyleFor,
  parseModeForActiveStyle,
  type ActiveStyleId,
} from "../types/activeStyle";

type MathfieldInternals = {
  defaultStyle?: Style;
  /** When `"none"`, insert style ignores neighboring atoms. */
  styleBias?: "left" | "right" | "none";
};

function internalField(field: MathfieldElement): MathfieldInternals | null {
  const host = field as MathfieldElement & { mathfield?: MathfieldInternals };
  return host.mathfield ?? null;
}

/**
 * Insertion style MathLive should use for the next typed characters.
 * Math → `{}` so TeX letter-shape (italic variables) applies; other Active
 * Styles return their MathLive Style. Neighbor-atom inheritance is disabled
 * separately via `styleBias = "none"`.
 */
export function insertStyleForActiveStyle(id: ActiveStyleId): Style {
  if (id === "math") return {};
  return mathLiveStyleFor(id);
}

/** Reset MathLive insertion style so a full Active Style replace sticks. */
export function clearInsertionStyle(field: MathfieldElement): void {
  const mf = internalField(field);
  if (!mf) return;
  mf.defaultStyle = {};
  // Stop inheriting upright digit / Function style from the previous atom
  // (that inheritance is what made retype-after-clear look roman).
  mf.styleBias = "none";
}

/**
 * Force MathLive parse mode + insertion style to match Active Style.
 * Used after Android Backspace / toolbar inserts that can drift `mode` to `text`
 * (so `^` becomes a literal instead of starting a superscript).
 */
export function lockModeToActiveStyle(
  field: MathfieldElement,
  id: ActiveStyleId,
): void {
  applyActiveStyleToField(field, id);
}

/**
 * Collapse a placeholder selection to a caret inside the slot.
 * MathLive `switchMode` rewrites a selected `\placeholder{}` (see getContent
 * treating placeholder as empty suffix) — that would destroy a fresh script.
 */
export function collapsePlaceholderSelection(field: MathfieldElement): void {
  if (field.selectionIsCollapsed) return;
  try {
    const ranges = field.selection?.ranges;
    if (!ranges?.length) return;
    const [start, end] = ranges[0];
    const pos = start === end ? start : Math.min(start + 1, end);
    field.selection = { ranges: [[pos, pos]] };
  } catch {
    /* selection may be frozen on some builds */
  }
}

/** Place a collapsed caret at the end of the current selection (or stay). */
export function collapseSelectionToEnd(field: MathfieldElement): void {
  try {
    const ranges = field.selection?.ranges;
    if (!ranges?.length) return;
    const end = ranges[0][1];
    field.selection = { ranges: [[end, end]] };
  } catch {
    /* selection may be frozen on some builds */
  }
}

/**
 * Restore mode + default insertion style only — do not restyle / wrap the
 * current selection. Used after opening a script slot so the selected
 * `\placeholder{}` is not rewritten by Function/`\mathrm` wraps.
 */
export function restoreInsertionStyleOnly(
  field: MathfieldElement,
  id: ActiveStyleId,
): void {
  const mode = parseModeForActiveStyle(id);
  clearInsertionStyle(field);
  // Collapse first so switchMode does not extract/replace the placeholder.
  collapsePlaceholderSelection(field);
  if (field.mode !== mode) {
    field.executeCommand(["switchMode", mode]);
  }
  if (id !== "math") {
    field.applyStyle(mathLiveStyleFor(id), { operation: "set" });
  }
}

/**
 * True when the current selection's LaTeX contains math layout (frac, root,
 * scripts, fences, …). Switching such a range to MathLive `text` mode via
 * `switchMode` extracts ascii-math and re-inserts TextAtoms — collapsing
 * `\frac{dy}{dx}` into `()/(dx)` and dropping the numerator.
 */
export function selectionHasMathStructure(field: MathfieldElement): boolean {
  if (field.selectionIsCollapsed) return false;
  try {
    const latex = field.getValue(field.selection, "latex") ?? "";
    if (!latex.trim()) return false;
    return /\\frac\b|\\dfrac\b|\\tfrac\b|\\sqrt\b|\\root\b|\\over\b|\\choose\b|\\binom\b|\\left\b|\\right\b|\\begin\b|\\sum\b|\\int\b|\\prod\b|\\lim\b|\^|_|\\overset\b|\\underset\b|\\stackrel\b/.test(
      latex,
    );
  } catch {
    return false;
  }
}

/**
 * Switch mode + set insertion style; if there is a selection, restyle it too.
 * Function / User styles also wrap the selection in `\\class{mt-ds-*}{...}` so
 * Define Styles CSS vars apply distinctly from Number / Variable.
 *
 * Exception: Text / Function (and similar) on a selection that contains math
 * structures must NOT `switchMode("text")` or wrap with `\mathrm{#@}` — that
 * flattens fractions into ascii-math TextAtoms. Apply upright style in place.
 */
export function applyActiveStyleToField(
  field: MathfieldElement,
  id: ActiveStyleId,
): void {
  const mode = parseModeForActiveStyle(id);
  const style = mathLiveStyleFor(id);
  const hasSelection = !field.selectionIsCollapsed;
  const structured = hasSelection && selectionHasMathStructure(field);

  clearInsertionStyle(field);

  // Structured selection: never extract via switchMode / \mathrm{#@} wrap.
  // Stamp upright / face style onto leaf atoms, then set insertion mode safely.
  if (
    structured &&
    (id === "text" || id === "function" || id === "user2" || mode === "text")
  ) {
    field.applyStyle(style, { operation: "set" });
    clearInsertionStyle(field);
    collapseSelectionToEnd(field);
    if (field.mode !== mode) {
      // Caret collapsed — safe to enter text mode for subsequent keystrokes.
      field.executeCommand(["switchMode", mode]);
    }
    if (id !== "math") {
      field.applyStyle(style, { operation: "set" });
    }
    return;
  }

  if (field.mode !== mode) {
    field.executeCommand(["switchMode", mode]);
  }

  const className = ACTIVE_STYLE_CLASS[id];

  if (hasSelection && className && !structured) {
    // Wrap selection so export / canvas CSS can target the face.
    if (id === "function") {
      field.executeCommand(["insert", `\\class{${className}}{\\mathrm{#@}}`]);
    } else if (id === "lcGreek" || id === "ucGreek") {
      field.executeCommand(["insert", `\\class{${className}}{#@}`]);
    } else if (id === "user1") {
      field.executeCommand(["insert", `\\class{${className}}{\\mathtt{#@}}`]);
    } else if (id === "user2") {
      field.executeCommand(["insert", `\\class{${className}}{\\mathrm{#@}}`]);
    }
  } else if (hasSelection && structured) {
    // Greek / User1 / etc. on structures: style in place (no flattening wrap).
    field.applyStyle(style, { operation: "set" });
  } else if (hasSelection) {
    field.applyStyle(style, { operation: "set" });
  }

  // Always refresh insertion style for subsequent typing.
  clearInsertionStyle(field);
  if (field.mode !== mode) {
    field.executeCommand(["switchMode", mode]);
  }
  // Math style: leave defaultStyle empty so TeX letter-shape rules apply.
  // Non-math styles stamp defaultStyle (also sets styleBias to "none").
  if (id !== "math") {
    field.applyStyle(style, { operation: "set" });
  }
}

/**
 * Hook for MathLive `onInsertStyle`: Active Style owns new typing, not the
 * style of the atom left of the caret (digits are upright in TeX and would
 * otherwise pull the next letter into roman / Function).
 */
export function bindInsertStyleHook(
  field: MathfieldElement,
  getActiveStyle: () => ActiveStyleId,
): void {
  field.onInsertStyle = () => insertStyleForActiveStyle(getActiveStyle());
}

/**
 * When Function / User style is active, type letters via `\\class{...}` so
 * Define Styles faces win over shared `.ML__cmr` Number mapping.
 */
export function insertStyledLetter(
  field: MathfieldElement,
  id: ActiveStyleId,
  letter: string,
): boolean {
  const className = ACTIVE_STYLE_CLASS[id];
  if (!className || !/^[a-zA-Z]$/.test(letter)) return false;

  if (id === "function" || id === "user2") {
    field.executeCommand(["insert", `\\class{${className}}{\\mathrm{${letter}}}`]);
    return true;
  }
  if (id === "user1") {
    field.executeCommand(["insert", `\\class{${className}}{\\mathtt{${letter}}}`]);
    return true;
  }
  return false;
}
