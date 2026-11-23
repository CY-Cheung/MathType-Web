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
};

function internalField(field: MathfieldElement): MathfieldInternals | null {
  const host = field as MathfieldElement & { mathfield?: MathfieldInternals };
  return host.mathfield ?? null;
}

/** Reset MathLive insertion style so a full Active Style replace sticks. */
export function clearInsertionStyle(field: MathfieldElement): void {
  const mf = internalField(field);
  if (mf) mf.defaultStyle = {};
}

/**
 * Switch mode + set insertion style; if there is a selection, restyle it too.
 * Function / User styles also wrap the selection in `\\class{mt-ds-*}{...}` so
 * Define Styles CSS vars apply distinctly from Number / Variable.
 */
export function applyActiveStyleToField(
  field: MathfieldElement,
  id: ActiveStyleId,
): void {
  const mode = parseModeForActiveStyle(id);
  const style = mathLiveStyleFor(id);

  clearInsertionStyle(field);

  if (field.mode !== mode) {
    field.executeCommand(["switchMode", mode]);
  }

  const hasSelection = !field.selectionIsCollapsed;
  const className = ACTIVE_STYLE_CLASS[id];

  if (hasSelection && className) {
    // Wrap selection so export / canvas CSS can target the face.
    if (id === "function") {
      field.executeCommand(["insert", `\\class{${className}}{\\mathrm{#@}}`]);
    } else if (id === "user1") {
      field.executeCommand(["insert", `\\class{${className}}{\\mathtt{#@}}`]);
    } else if (id === "user2") {
      field.executeCommand(["insert", `\\class{${className}}{\\mathrm{#@}}`]);
    }
  } else if (hasSelection) {
    field.applyStyle(style, { operation: "set" });
  }

  // Always refresh insertion style for subsequent typing.
  clearInsertionStyle(field);
  if (field.mode !== mode) {
    field.executeCommand(["switchMode", mode]);
  }
  // Math style: leave defaultStyle empty so TeX letter-shape rules apply.
  if (id !== "math") {
    field.applyStyle(style, { operation: "set" });
  }
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
