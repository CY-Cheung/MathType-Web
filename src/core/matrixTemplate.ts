/**
 * MathType 6.9b custom matrix, compiled to a MathLive array.
 * Vertical rules use the column spec (`|` solid, `:` dashed).
 * A horizontal rule hangs below that row's placeholders, inside the
 * row gap. It is not an extra array row, so the fences stay the height
 * of the real rows.
 * `#?` is the same placeholder token the template buttons insert.
 */

export const MIN_MATRIX_SIZE = 1;
export const MAX_MATRIX_SIZE = 10;

export type LineStyle = "none" | "solid" | "dashed";
export type ColumnAlign = "left" | "center" | "right";
export type RowAlign = "top" | "baseline" | "bottom";
export type MatrixFence = "none" | "paren" | "bracket" | "brace" | "bar";

export type MatrixSpec = {
  rows: number;
  columns: number;
  columnAlign: ColumnAlign;
  rowAlign: RowAlign;
  /** One entry per gap between columns. */
  verticalLines: LineStyle[];
  /** One entry per gap between rows. */
  horizontalLines: LineStyle[];
  fence: MatrixFence;
};

const LINE_CYCLE: LineStyle[] = ["none", "solid", "dashed"];
const ALIGN: Record<ColumnAlign, string> = { left: "l", center: "c", right: "r" };
const RULE: Record<LineStyle, string> = { none: "", solid: "|", dashed: ":" };
const FENCE: Record<MatrixFence, readonly [string, string] | null> = {
  none: null,
  paren: ["\\left(", "\\right)"],
  bracket: ["\\left[", "\\right]"],
  brace: ["\\left\\{", "\\right\\}"],
  bar: ["\\left|", "\\right|"],
};

export function createMatrixSpec(): MatrixSpec {
  return {
    rows: 2,
    columns: 2,
    columnAlign: "center",
    rowAlign: "baseline",
    verticalLines: ["none"],
    horizontalLines: ["none"],
    fence: "paren",
  };
}

export function clampMatrixCount(value: number): number {
  if (!Number.isFinite(value)) return MIN_MATRIX_SIZE;
  return Math.min(MAX_MATRIX_SIZE, Math.max(MIN_MATRIX_SIZE, Math.round(value)));
}

function fitLines(lines: LineStyle[], length: number): LineStyle[] {
  return Array.from({ length }, (_, index) => lines[index] ?? "none");
}

export function withMatrixSize(spec: MatrixSpec, rows: number, columns: number): MatrixSpec {
  const nextRows = clampMatrixCount(rows);
  const nextColumns = clampMatrixCount(columns);
  return {
    ...spec,
    rows: nextRows,
    columns: nextColumns,
    verticalLines: fitLines(spec.verticalLines, Math.max(0, nextColumns - 1)),
    horizontalLines: fitLines(spec.horizontalLines, Math.max(0, nextRows - 1)),
  };
}

export function cycleLine(style: LineStyle): LineStyle {
  const index = LINE_CYCLE.indexOf(style);
  return LINE_CYCLE[(index + 1) % LINE_CYCLE.length];
}

function columnSpec(spec: MatrixSpec): string {
  const align = ALIGN[spec.columnAlign];
  let result = "";
  for (let column = 0; column < spec.columns; column += 1) {
    if (column > 0) result += RULE[spec.verticalLines[column - 1] ?? "none"];
    result += align;
  }
  return result;
}

/** Thin rule. 0.08em is about 2px at the 200% editor zoom. */
const RULE_THICKNESS = "0.08em";
const RULE_RAISE = "-0.68em";
const RULE_ROW_GAP = "0.65em";
/** From the right edge of an empty slot back past its left edge. */
const SLOT_BACK = "-0.72em";
/** Distance between the left edges of neighboring empty-slot columns. */
const COLUMN_PITCH_EM = 2.04;
/** Covers the last slot plus a small pad, and stops inside the fence. */
const LAST_RULE_EM = 0.7;

function ruleSpanEm(columns: number): number {
  return (columns - 1) * COLUMN_PITCH_EM + LAST_RULE_EM;
}

function solidRule(columns: number): string {
  const width = ruleSpanEm(columns).toFixed(2);
  return `\\mathrlap{\\hspace{${SLOT_BACK}}\\rule[${RULE_RAISE}]{${width}em}{${RULE_THICKNESS}}}`;
}

function dashedRule(columns: number): string {
  const target = ruleSpanEm(columns);
  const dash = 0.4;
  const gap = 0.18;
  const parts: string[] = [];
  let used = 0;
  while (used + dash <= target + 0.02) {
    if (parts.length > 0) {
      parts.push(`\\hspace{${gap}em}`);
      used += gap;
    }
    parts.push(`\\rule[${RULE_RAISE}]{${dash}em}{${RULE_THICKNESS}}`);
    used += dash;
  }
  return `\\mathrlap{\\hspace{${SLOT_BACK}}${parts.join("")}}`;
}

function rowLatex(style: LineStyle | undefined, columns: number): string {
  const cells = Array.from({ length: columns }, () => "#?");
  if (style && style !== "none") cells[0] = `#?${style === "dashed" ? dashedRule(columns) : solidRule(columns)}`;
  return cells.join("&");
}

function fenceLatex(fence: MatrixFence, body: string): string {
  const pair = FENCE[fence];
  return pair ? `${pair[0]}${body}${pair[1]}` : body;
}

/** Shift the whole matrix. Baseline stays on MathLive's row baseline. */
function raiseLatex(latex: string, align: RowAlign): string {
  if (align === "baseline") return latex;
  const em = align === "top" ? "0.50em" : "-0.60em";
  return `\\raise{${em}}{${latex}}`;
}

export function matrixToLatex(spec: MatrixSpec): string {
  const rows: string[] = [];
  const breaks: string[] = [];
  for (let row = 0; row < spec.rows; row += 1) {
    const below = row < spec.rows - 1 ? spec.horizontalLines[row] : undefined;
    rows.push(rowLatex(below, spec.columns));
    if (row < spec.rows - 1) breaks.push(below && below !== "none" ? `\\\\[${RULE_ROW_GAP}]` : "\\\\");
  }
  const array = `\\begin{array}{${columnSpec(spec)}}${rows.map((row, index) => (index === 0 ? row : `${breaks[index - 1]}${row}`)).join("")}\\end{array}`;
  return raiseLatex(fenceLatex(spec.fence, array), spec.rowAlign);
}
