/**
 * MathType-style Active Style Switcher (Style menu), distinct from Define Styles.
 * Controls the style applied to new typing / the current selection.
 */

import type { ParseMode, Style } from "mathlive";

export type ActiveStyleId =
  | "math"
  | "text"
  | "function"
  | "variable"
  | "vectorMatrix"
  | "user1"
  | "user2";

export type ActiveStyleMeta = {
  id: ActiveStyleId;
  /** Status bar / menu label (MathType wording). */
  label: string;
  shortcut?: string;
};

/** Style menu order (MathType Style drop-down subset). */
export const ACTIVE_STYLE_ORDER: readonly ActiveStyleMeta[] = [
  { id: "math", label: "Math", shortcut: "Ctrl+Shift+M" },
  { id: "text", label: "Text", shortcut: "Ctrl+Shift+E" },
  { id: "function", label: "Function" },
  { id: "variable", label: "Variable" },
  { id: "vectorMatrix", label: "Vector-Matrix" },
  { id: "user1", label: "User 1" },
  { id: "user2", label: "User 2" },
] as const;

export const DEFAULT_ACTIVE_STYLE: ActiveStyleId = "math";

const ACTIVE_IDS = new Set<ActiveStyleId>(ACTIVE_STYLE_ORDER.map((row) => row.id));

export function isActiveStyleId(value: unknown): value is ActiveStyleId {
  return typeof value === "string" && ACTIVE_IDS.has(value as ActiveStyleId);
}

export function activeStyleLabel(id: ActiveStyleId): string {
  return ACTIVE_STYLE_ORDER.find((row) => row.id === id)?.label ?? "Math";
}

/** MathLive parse mode for an active style. */
export function parseModeForActiveStyle(id: ActiveStyleId): ParseMode {
  return id === "text" ? "text" : "math";
}

/**
 * Insertion / selection Style for MathLive `applyStyle({ operation: "set" })`.
 * Text mode relies mainly on `switchMode("text")`; style still clears math variants.
 */
export function mathLiveStyleFor(id: ActiveStyleId): Style {
  switch (id) {
    case "text":
      return {
        variant: "normal",
        variantStyle: "up",
        fontShape: "n",
        fontSeries: "m",
        fontFamily: "roman",
      };
    case "function":
      return {
        variant: "normal",
        variantStyle: "up",
        fontShape: "n",
        fontSeries: "m",
        fontFamily: "roman",
      };
    case "math":
      // Empty → MathLive letterShapeStyle ("tex") auto-italics variables / upright digits.
      return {
        variant: "normal",
        variantStyle: "",
        fontShape: "auto",
        fontSeries: "auto",
        fontFamily: "none",
      };
    case "variable":
      return {
        variant: "normal",
        variantStyle: "italic",
        fontShape: "it",
        fontSeries: "m",
        fontFamily: "none",
      };
    case "vectorMatrix":
      return {
        variant: "normal",
        variantStyle: "bold",
        fontShape: "n",
        fontSeries: "b",
        fontFamily: "roman",
      };
    case "user1":
      return {
        variant: "monospace",
        variantStyle: "up",
        fontShape: "n",
        fontSeries: "m",
        fontFamily: "monospace",
      };
    case "user2":
      return {
        variant: "normal",
        variantStyle: "up",
        fontShape: "n",
        fontSeries: "m",
        fontFamily: "roman",
      };
    default:
      return {};
  }
}

/**
 * Infer Active Style from caret / selection atom (for status bar).
 * Falls back to `fallback` when the atom has no distinctive style (plain Math).
 */
export function inferActiveStyleFromAtom(
  mode: ParseMode | undefined,
  style: Style | undefined,
  fallback: ActiveStyleId = "math",
): ActiveStyleId {
  if (mode === "text") return "text";
  if (mode === "latex") return fallback;

  const variant = style?.variant;
  const variantStyle = style?.variantStyle;
  const fontFamily = style?.fontFamily;
  const fontSeries = style?.fontSeries;

  if (fontFamily === "monospace" || variant === "monospace") return "user1";
  if (variantStyle === "bold" || variantStyle === "bolditalic" || fontSeries === "b") {
    return "vectorMatrix";
  }
  if (variantStyle === "up" || variant === "main") return "function";
  if (variantStyle === "italic" || style?.fontShape === "it") return "variable";
  return fallback;
}

/** CSS class stamped via `\\class{...}{...}` for Function / User faces. */
export const ACTIVE_STYLE_CLASS: Partial<Record<ActiveStyleId, string>> = {
  function: "mt-ds-fn",
  user1: "mt-ds-user1",
  user2: "mt-ds-user2",
};
