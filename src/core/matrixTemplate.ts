/**
 * MathType 6.9b custom matrix, compiled to a MathLive array.
 * Vertical rules use the column spec (`|` solid, `:` dashed).
 * Horizontal rules are a full-width `\rule` under the row, with space
 * above and below so the line is not flush against the slots.
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

const RULE_THICKNESS = "0.16em";
const RULE_SHIFT = "-0.95em";
const RULE_SEGMENT_EM = 1.9;
const RULE_PITCH_EM = 2.925;

function ruleWidthEm(columns: number): number {
  return (columns - 1) * RULE_PITCH_EM + RULE_SEGMENT_EM;
}

function solidRule(columns: number): string {
  return `\\hspace{${RULE_SHIFT}}\\mathrlap{\\rule{${ruleWidthEm(columns).toFixed(2)}em}{${RULE_THICKNESS}}}`;
}

function dashedRule(columns: number): string {
  const target = ruleWidthEm(columns);
  const dash = 0.44;
  const gap = 0.18;
  const parts: string[] = [];
  let used = 0;
  while (used + dash <= target + 0.05) {
    if (parts.length > 0) {
      parts.push(`\\hspace{${gap}em}`);
      used += gap;
    }
    parts.push(`\\rule{${dash}em}{${RULE_THICKNESS}}`);
    used += dash;
  }
  return `\\hspace{${RULE_SHIFT}}\\mathrlap{${parts.join("")}}`;
}

function ruledCell(mark: string): string {
  return `\\begin{array}{c}#?\\\\[0.85em]${mark}\\\\[0.8em]\\end{array}`;
}

function ruledRow(style: LineStyle, columns: number): string {
  const phantom = `\\vphantom{\\rule{0.2em}{${RULE_THICKNESS}}}`;
  const rule = style === "dashed" ? dashedRule(columns) : solidRule(columns);
  return Array.from({ length: columns }, (_, column) => ruledCell(column === 0 ? rule : phantom)).join("&");
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
    if (below && below !== "none") rows.push(ruledRow(below, spec.columns));
    else rows.push(Array.from({ length: spec.columns }, () => "#?").join("&"));
  }
  const array = `\\begin{array}{${columnSpec(spec)}}${rows.join("\\\\")}\\end{array}`;
  return raiseLatex(fenceLatex(spec.fence, array), spec.rowAlign);
}
