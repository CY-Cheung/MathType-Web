/**
 * Toolbar / shortcut insert with Active Style awareness.
 * Script templates (`^{…}`, `_{…}`) need math mode; when Active Style is Text
 * we briefly switch to math, insert, then restore Text inside the new slot.
 */

import type { MathfieldElement } from "mathlive";
import { commitPendingComposition } from "../adapters/commitComposition";
import type { ActiveStyleId } from "../types/activeStyle";
import {
  collapsePlaceholderSelection,
  collapseSelectionToEnd,
  lockModeToActiveStyle,
  restoreInsertionStyleOnly,
} from "./activeStyleApply";
import { adaptInsertTemplate, isScriptInsertTemplate } from "./insertTemplate";
import { toMathliveTemplate } from "./shortcuts";

export type InsertAdaptedOptions = {
  activeStyle: ActiveStyleId;
  /**
   * While true, MathEditor's mode-change listener must not snap mode back to
   * Text mid-insert (we need a brief math-mode window for scripts).
   */
  suppressModeLock?: { current: boolean };
};

/**
 * Commit IME composition, adapt `#@`→`#?` when collapsed, insert, then
 * re-lock Active Style (so Text/Function stay in the new script slot).
 */
export function insertAdaptedLatex(
  field: MathfieldElement,
  latex: string,
  options: InsertAdaptedOptions,
): void {
  commitPendingComposition(field);
  const hadSelection = !field.selectionIsCollapsed;
  const raw = toMathliveTemplate(latex);
  const { activeStyle, suppressModeLock } = options;

  // Superscripts/subscripts are math structures — Text mode would no-op, and
  // inserting `^{#?}` next to a text atom creates a detached empty base.
  const needsMathBridge =
    isScriptInsertTemplate(raw) &&
    (field.mode === "text" || activeStyle === "text");

  if (needsMathBridge && suppressModeLock) {
    suppressModeLock.current = true;
  }

  try {
    if (needsMathBridge) {
      insertScriptFromTextMode(field, raw, hadSelection);
      restoreInsertionStyleOnly(field, activeStyle);
      return;
    }

    const adapted = adaptInsertTemplate(raw, hadSelection);
    field.executeCommand(["insert", adapted]);
    if (isScriptInsertTemplate(adapted)) {
      // Script inserts leave `\placeholder{}` selected — insertion-only restore
      // so Function/`\mathrm` wraps do not eat the slot.
      restoreInsertionStyleOnly(field, activeStyle);
    } else {
      lockModeToActiveStyle(field, activeStyle);
    }
  } finally {
    if (needsMathBridge && suppressModeLock) {
      queueMicrotask(() => {
        suppressModeLock.current = false;
      });
    }
  }
}

/**
 * Text → math bridge for scripts:
 * - Collapsed caret: convert the previous character to math, then
 *   `moveToSuperscript` / `moveToSubscript` so the script attaches to that base
 *   (`A` + superscript → `A^{□}`), not a detached empty `\mathrm{}^{□}`.
 * - Selection: convert the selection to math, then apply `#@` (into the script).
 */
function insertScriptFromTextMode(
  field: MathfieldElement,
  rawTemplate: string,
  hadSelection: boolean,
): void {
  if (!hadSelection) {
    const pos = field.position ?? 0;
    if (pos > 0) {
      try {
        field.selection = { ranges: [[pos - 1, pos]] };
      } catch {
        /* ignore */
      }
    }
    if (field.mode !== "math") {
      field.executeCommand(["switchMode", "math"]);
    }
    // Caret after the converted base.
    collapseSelectionToEnd(field);
    openScriptBranch(field, rawTemplate);
    collapsePlaceholderSelection(field);
    return;
  }

  if (field.mode !== "math") {
    field.executeCommand(["switchMode", "math"]);
  }
  const adapted = adaptInsertTemplate(rawTemplate, true);
  field.executeCommand(["insert", adapted]);
  collapsePlaceholderSelection(field);
}

/** Prefer MathLive moveTo* so the script hangs on the preceding atom. */
function openScriptBranch(field: MathfieldElement, rawTemplate: string): void {
  if (rawTemplate === "^{#@}" || rawTemplate === "^{#?}") {
    field.executeCommand("moveToSuperscript");
    return;
  }
  if (rawTemplate === "_{#@}" || rawTemplate === "_{#?}") {
    field.executeCommand("moveToSubscript");
    return;
  }
  if (rawTemplate === "_{#@}^{#?}" || rawTemplate === "_{#?}^{#?}") {
    field.executeCommand("moveToSubscript");
    field.executeCommand("moveToSuperscript");
    return;
  }
  field.executeCommand(["insert", adaptInsertTemplate(rawTemplate, false)]);
}
