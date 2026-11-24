/**
 * Format → Align helpers: wrap / convert latex into multi-line aligned forms.
 */

export type AlignMode = "left" | "center" | "right" | "eq";

const OUTER_ENV_RE =
  /^\\begin\{(gathered|aligned|flalign\*|align\*?|eqnarray\*?)\}([\s\S]*)\\end\{\1\}$/;
const DISPLAYLINES_RE = /^\\displaylines\{([\s\S]*)\}$/;

/**
 * Strip an outer multiline wrapper so Align can re-wrap after Enter edits.
 */
export function unwrapMultilineBody(latex: string): string {
  const trimmed = latex.trim();
  if (!trimmed) return "";
  const display = DISPLAYLINES_RE.exec(trimmed);
  if (display) return display[1].trim();
  const env = OUTER_ENV_RE.exec(trimmed);
  if (env) return env[2].trim();
  return trimmed;
}

function splitLines(latex: string): string[] {
  const trimmed = latex.trim();
  if (!trimmed) return [""];
  return trimmed
    .split(/\\\\(?:\[[^\]]*\])?/)
    .map((line) => line.trim())
    .filter((line, _index, arr) => line.length > 0 || arr.length === 1);
}

function stripFlalignPads(line: string): string {
  return line.replace(/&&\s*$/, "").replace(/^\s*&&/, "").trim();
}

function alignEquals(line: string): string {
  if (/&=/.test(line)) return line;
  const idx = line.search(/(^|[^\\&])=/);
  if (idx < 0) return line;
  const at = line[idx] === "=" ? idx : idx + 1;
  return `${line.slice(0, at)}&${line.slice(at)}`;
}

/**
 * Wrap latex for the requested alignment mode.
 * Empty selection → empty aligned template with one slot.
 */
export function formatAlignLatex(latex: string, mode: AlignMode): string {
  const raw = unwrapMultilineBody(latex);
  const lines = raw ? splitLines(raw).map(stripFlalignPads) : ["#?"];

  if (mode === "eq") {
    const body = lines.map(alignEquals).join("\\\\");
    return `\\begin{aligned}${body}\\end{aligned}`;
  }

  if (mode === "center") {
    const body = lines.join("\\\\");
    return `\\begin{gathered}${body}\\end{gathered}`;
  }

  const body = lines
    .map((line) => (mode === "left" ? `${line}&&` : `&&${line}`))
    .join("\\\\");
  return `\\begin{flalign*}${body}\\end{flalign*}`;
}
