import { convertLatexToMarkup } from "mathlive";
import { useMemo } from "react";
import "mathlive/static.css";
import "./math-markup.css";

/** Button preview only. Inserted templates still keep `#@` and `#?` slots. */
function iconLatex(latex: string): string {
  if (!latex.includes("#@") && !latex.includes("#?")) return latex;

  const operator = latex.match(
    /^\\(iiiint|iiint|iint|int|sum|prod|coprod|bigcup|bigcap|bigvee|bigwedge|bigoplus|bigotimes)/,
  );
  if (operator) return `\\${operator[1]}`;

  // Keep outer `\left` / `\right` (including single-sided `\left.` / `\right.`)
  // so toolbar icons show one-sided fences instead of a bare matrix.
  if (latex.includes("\\left") || latex.includes("\\right")) {
    let preview = latex;
    if (latex.includes("\\begin{")) {
      const rows = latex.split("\\\\").length;
      const cols = (latex.split("\\\\")[0]?.match(/&/g)?.length ?? 0) + 1;
      const row = Array.from({ length: cols }, () => "\\cdot").join("&");
      const body = Array.from({ length: rows }, () => row).join("\\\\");
      preview = latex.replace(
        /\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/,
        `\\begin{smallmatrix}${body}\\end{smallmatrix}`,
      );
    }
    return preview.replaceAll("#@", "\\mkern1mu").replaceAll("#?", "\\mkern1mu");
  }
  if (latex.includes("\\begin{")) {
    const rows = latex.split("\\\\").length;
    const cols = (latex.split("\\\\")[0]?.match(/&/g)?.length ?? 0) + 1;
    const row = Array.from({ length: cols }, () => "\\cdot").join("&");
    const body = Array.from({ length: rows }, () => row).join("\\\\");
    return `\\begin{smallmatrix}${body}\\end{smallmatrix}`;
  }
  if (latex.startsWith("\\sqrt[")) return "\\sqrt[n]{\\mkern1mu}";
  if (latex.startsWith("\\sqrt")) return "\\surd";
  if (latex.startsWith("\\frac")) return "\\frac{\\mkern3mu}{\\mkern3mu}";
  if (latex === "#@/#?") return "\\mkern2mu/\\mkern2mu";
  if (latex === "^{#@}") return "x^{n}";
  if (latex === "_{#@}") return "x_{n}";
  if (latex === "_{#@}^{#?}") return "x_{n}^{m}";
  return latex.replaceAll("#@", "x").replaceAll("#?", "");
}

type MathMarkupProps = {
  latex: string;
  className?: string;
};

export function MathMarkup({ latex, className }: MathMarkupProps) {
  const html = useMemo(() => {
    try {
      return convertLatexToMarkup(iconLatex(latex), {
        defaultMode: "inline-math",
        letterShapeStyle: "tex",
      });
    } catch {
      return "";
    }
  }, [latex]);

  return (
    <span
      className={`mt-markup pointer-events-none inline-flex items-center justify-center leading-none ${className ?? ""}`}
      style={{
        fontFamily:
          'var(--mt-math-font, var(--mt-math-font-family, "Times New Roman", "TeX Gyre Termes", "Liberation Serif", Times, serif))',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
