/**
 * Format → Align helpers: wrap / convert latex into multi-line aligned forms.
 */

export type AlignMode = "left" | "center" | "right" | "eq";

function splitLines(latex: string): string[] {
  const trimmed = latex.trim();
  if (!trimmed) return [""];
  // Prefer existing \\ breaks; otherwise treat as a single line.
  return trimmed
    .split(/\\\\(?:\[[^\]]*\])?/)
    .map((line) => line.trim())
    .filter((line, _index, arr) => line.length > 0 || arr.length === 1);
}

function alignEquals(line: string): string {
  // First bare `=` that is not already `&=`.
  if (/&=/.test(line)) return line;
  const idx = line.search(/(^|[^\\&])=/);
  if (idx < 0) return line;
  // idx points at the char before `=`, or 0 when `=` is first.
  const at = line[idx] === "=" ? idx : idx + 1;
  return `${line.slice(0, at)}&${line.slice(at)}`;
}

/**
 * Wrap latex for the requested alignment mode.
 * Empty selection → empty aligned template with one slot.
 */
export function formatAlignLatex(latex: string, mode: AlignMode): string {
  const raw = latex.trim();
  const lines = raw ? splitLines(raw) : ["#?"];

  if (mode === "eq") {
    const body = lines.map(alignEquals).join("\\\\");
    return `\\begin{aligned}${body}\\end{aligned}`;
  }

  if (mode === "center") {
    const body = lines.join("\\\\");
    return `\\begin{gathered}${body}\\end{gathered}`;
  }

  // left / right: flalign* with empty opposite column
  const body = lines
    .map((line) => (mode === "left" ? `${line}&&` : `&&${line}`))
    .join("\\\\");
  return `\\begin{flalign*}${body}\\end{flalign*}`;
}
