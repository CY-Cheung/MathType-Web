import type { MathfieldElement } from "mathlive";

export type EditorSelection = {
  ranges: [number, number][];
  direction?: "forward" | "backward" | "none";
};

export function readSelection(field: MathfieldElement): EditorSelection {
  const selection = field.selection;
  const ranges = selection.ranges.map((range) => [range[0], range[1]] as [number, number]);
  return {
    ranges: ranges.length > 0 ? ranges : [[field.position, field.position]],
    direction: selection.direction,
  };
}

export function focusAt(field: MathfieldElement, at?: EditorSelection | null): void {
  field.focus();
  if (!at) return;
  field.selection = { ranges: at.ranges, direction: at.direction };
}
