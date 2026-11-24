/**
 * Matrix cells reset to TeX textstyle — outer `\displaystyle` does not stick.
 * Use `\dfrac` (or per-cell display) so fractions keep MathType-like full size.
 */

import type { MathfieldElement } from "mathlive";

const MATRIX_ENV = String.raw`(?:p|b|v|V|B)?matrix|array`;
const BEGIN_RE = new RegExp(String.raw`\\begin\{(${MATRIX_ENV})\}`, "g");
const END_RE = new RegExp(String.raw`\\end\{(${MATRIX_ENV})\}`, "g");

const MATRIX_ENV_NAMES = new Set([
  "matrix",
  "pmatrix",
  "bmatrix",
  "Bmatrix",
  "vmatrix",
  "Vmatrix",
  "array",
]);

/** Net open matrix/array environments in a latex prefix. */
export function matrixEnvDepth(latex: string): number {
  let depth = 0;
  const tokens: { at: number; delta: number }[] = [];
  BEGIN_RE.lastIndex = 0;
  END_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BEGIN_RE.exec(latex))) {
    tokens.push({ at: match.index, delta: 1 });
  }
  while ((match = END_RE.exec(latex))) {
    tokens.push({ at: match.index, delta: -1 });
  }
  tokens.sort((a, b) => a.at - b.at);
  for (const token of tokens) {
    depth = Math.max(0, depth + token.delta);
  }
  return depth;
}

type MatrixAtom = {
  type?: string;
  environmentName?: string;
  parent?: MatrixAtom | null;
};

type MathfieldModel = {
  position: number;
  parentEnvironment?: MatrixAtom | null;
  at?: (offset: number) => MatrixAtom | undefined;
};

/**
 * MathLive model offsets are atom indices, not latex character offsets —
 * `getValue({ranges:[[0,pos]]})` therefore omits `\begin{pmatrix}` wrappers.
 * Walk `parentEnvironment` / atom parents instead.
 */
function mathfieldModel(field: MathfieldElement): MathfieldModel | null {
  // MathLive keeps the editor model on a private host field.
  const host = field as unknown as {
    _mathfield?: { model?: MathfieldModel };
  };
  return host._mathfield?.model ?? null;
}

function isMatrixArrayAtom(atom: MatrixAtom | null | undefined): boolean {
  if (!atom || atom.type !== "array") return false;
  return MATRIX_ENV_NAMES.has(atom.environmentName ?? "");
}

/** True when the caret sits inside a matrix / array cell. */
export function isCaretInMatrixEnvironment(field: MathfieldElement): boolean {
  const model = mathfieldModel(field);
  if (!model) return false;
  if (isMatrixArrayAtom(model.parentEnvironment)) return true;
  try {
    let atom: MatrixAtom | null | undefined = model.at?.(model.position);
    let guard = 0;
    while (atom && guard++ < 32) {
      if (isMatrixArrayAtom(atom)) return true;
      atom = atom.parent ?? null;
    }
  } catch {
    return false;
  }
  return false;
}

const FRAC_TEMPLATE = "\\frac{#@}{#?}";
const DFRAC_TEMPLATE = "\\dfrac{#@}{#?}";

/**
 * When inserting a plain fraction template inside a matrix, upgrade to `\dfrac`.
 * Leaves slanted `#@/#?`, `\tfrac`, and already-`\dfrac` alone.
 */
export function adaptFracTemplateForMatrix(
  latex: string,
  inMatrix: boolean,
): string {
  if (!inMatrix) return latex;
  if (latex === FRAC_TEMPLATE) return DFRAC_TEMPLATE;
  // Generic `\frac{…}{…}` insert (rare) — upgrade command name only.
  if (
    /^\\frac\{/.test(latex) &&
    !/^\\dfrac\{/.test(latex) &&
    !/^\\tfrac\{/.test(latex)
  ) {
    return `\\d${latex.slice(1)}`;
  }
  return latex;
}

/** Default row skip so full-size `\dfrac` numerators/denominators do not collide. */
export const MATRIX_DISPLAY_ROW_GAP = "0.85em";

/**
 * Inside matrix/array environments, rewrite bare `\frac` → `\dfrac`.
 * Skips `\dfrac` / `\tfrac` / `\cfrac`. Used for PNG/SVG export preprocessing.
 */
export function upgradeMatrixFractions(latex: string): string {
  if (!latex.includes("\\frac") || !latex.includes("\\begin{")) return latex;

  let out = "";
  let i = 0;
  let depth = 0;
  const beginPat = new RegExp(String.raw`^\\begin\{(${MATRIX_ENV})\}`);
  const endPat = new RegExp(String.raw`^\\end\{(${MATRIX_ENV})\}`);

  while (i < latex.length) {
    const slice = latex.slice(i);
    const begin = beginPat.exec(slice);
    if (begin) {
      out += begin[0];
      i += begin[0].length;
      depth += 1;
      continue;
    }
    const end = endPat.exec(slice);
    if (end) {
      out += end[0];
      i += end[0].length;
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (depth > 0) {
      if (
        slice.startsWith("\\dfrac") ||
        slice.startsWith("\\tfrac") ||
        slice.startsWith("\\cfrac")
      ) {
        // Copy the command name as-is (avoid matching inner `\frac`).
        const name = slice.startsWith("\\dfrac")
          ? "\\dfrac"
          : slice.startsWith("\\tfrac")
            ? "\\tfrac"
            : "\\cfrac";
        out += name;
        i += name.length;
        continue;
      }
      if (slice.startsWith("\\frac")) {
        out += "\\dfrac";
        i += "\\frac".length;
        continue;
      }
    }

    out += latex[i];
    i += 1;
  }
  return out;
}

/**
 * When a matrix holds `\dfrac`, give bare `\\` row breaks an explicit skip.
 * Leaves existing `\\[…]` alone. MathLive pmatrix vlists ignore CSS padding.
 */
export function ensureMatrixDisplayRowGaps(
  latex: string,
  gap: string = MATRIX_DISPLAY_ROW_GAP,
): string {
  if (!latex.includes("\\dfrac") || !latex.includes("\\begin{")) return latex;
  if (!latex.includes("\\\\")) return latex;

  let out = "";
  let i = 0;
  let depth = 0;
  const beginPat = new RegExp(String.raw`^\\begin\{(${MATRIX_ENV})\}`);
  const endPat = new RegExp(String.raw`^\\end\{(${MATRIX_ENV})\}`);
  const skip = `\\\\[${gap}]`;

  while (i < latex.length) {
    const slice = latex.slice(i);
    const begin = beginPat.exec(slice);
    if (begin) {
      out += begin[0];
      i += begin[0].length;
      depth += 1;
      continue;
    }
    const end = endPat.exec(slice);
    if (end) {
      out += end[0];
      i += end[0].length;
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (depth > 0 && slice.startsWith("\\\\")) {
      if (slice[2] === "[") {
        // Already has an optional skip — copy through the closing `]`.
        const close = slice.indexOf("]");
        if (close > 2) {
          out += slice.slice(0, close + 1);
          i += close + 1;
          continue;
        }
      }
      out += skip;
      i += 2;
      continue;
    }

    out += latex[i];
    i += 1;
  }
  return out;
}

/** Export preprocess: full-size matrix fractions + roomy row skips. */
export function prepareMatrixLatexForExport(latex: string): string {
  return ensureMatrixDisplayRowGaps(upgradeMatrixFractions(latex));
}
