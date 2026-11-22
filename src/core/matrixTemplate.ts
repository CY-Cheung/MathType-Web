/**
 * MathType 6.9b custom matrix, compiled to a MathLive array.
 * Vertical rules use the column spec (`|` solid, `:` dashed).
 * Horizontal rules sit under each cell in that row: `\underline` or a short dash.
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

function cellLatex(below: LineStyle | undefined): string {
  if (!below || below === "none") return "#?";
  if (below === "dashed") return "\\underset{\\text{-\\,-}}{#?}";
  return "\\underline{#?}";
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
  for (let row = 0; row < spec.rows; row += 1) {
    const below = row < spec.rows - 1 ? spec.horizontalLines[row] : undefined;
    const cells = Array.from({ length: spec.columns }, () => cellLatex(below));
    rows.push(cells.join("&"));
  }
  const array = `\\begin{array}{${columnSpec(spec)}}${rows.join("\\\\")}\\end{array}`;
  return raiseLatex(fenceLatex(spec.fence, array), spec.rowAlign);
}
