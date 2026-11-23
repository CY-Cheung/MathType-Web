import { convertLatexToMathMl } from "mathlive";
import { buildEqHref } from "./eqHash";
import {
  DEFAULT_EXPORT_SCALE,
  renderFormulaPng,
  renderFormulaSvg,
  type RasterResult,
} from "./renderFormula";

export type ExportFormat = "mathml" | "png" | "svg" | "latex";

export type ClipboardExportResult = {
  format: ExportFormat;
  /** Human-readable status for the footer toast. */
  message: string;
  /** True when we fell back to text/plain LaTeX. */
  fallback: boolean;
};

export function canUseClipboardItems(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof ClipboardItem !== "undefined" &&
    !!navigator.clipboard?.write &&
    window.isSecureContext
  );
}

/** Normalize MathLive MathML into a single `<math xmlns=...>` root. */
export function buildMathMl(latex: string): string {
  let ml = convertLatexToMathMl(latex).trim();
  if (!ml) throw new Error("Empty MathML");
  if (!/^<math[\s>]/i.test(ml)) {
    ml = `<math xmlns="http://www.w3.org/1998/Math/MathML">${ml}</math>`;
  } else if (!/\sxmlns=/.test(ml)) {
    ml = ml.replace(/^<math\b/i, '<math xmlns="http://www.w3.org/1998/Math/MathML"');
  }
  return ml;
}

/** HTML fragment Word recognizes when pasting MathML as a native equation. */
export function wrapMathMlForWord(mathMl: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${mathMl}</body></html>`;
}

async function writeClipboardItems(items: Record<string, Blob>): Promise<void> {
  const clipboardItem = new ClipboardItem(items);
  await navigator.clipboard.write([clipboardItem]);
}

async function writeLatexFallback(latex: string, reason: string): Promise<ClipboardExportResult> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(latex);
  } else {
    throw new Error("Clipboard unavailable");
  }
  return {
    format: "latex",
    message: `Fallback: LaTeX (${reason})`,
    fallback: true,
  };
}

export async function copyLatex(latex: string): Promise<ClipboardExportResult> {
  if (!latex.trim()) throw new Error("Nothing to copy");
  if (canUseClipboardItems()) {
    try {
      await writeClipboardItems({
        "text/plain": new Blob([latex], { type: "text/plain" }),
      });
      return { format: "latex", message: "Copied: LaTeX", fallback: false };
    } catch {
      /* fall through */
    }
  }
  return writeLatexFallback(latex, "text");
}

export async function copyMathMl(latex: string): Promise<ClipboardExportResult> {
  if (!latex.trim()) throw new Error("Nothing to copy");
  const mathMl = buildMathMl(latex);
  if (!canUseClipboardItems()) {
    return writeLatexFallback(latex, "no ClipboardItem");
  }
  const html = wrapMathMlForWord(mathMl);
  const attempts: Record<string, Blob>[] = [
    {
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([latex], { type: "text/plain" }),
    },
    {
      "text/html": new Blob([html], { type: "text/html" }),
      "application/mathml+xml": new Blob([mathMl], { type: "application/mathml+xml" }),
      "text/plain": new Blob([latex], { type: "text/plain" }),
    },
  ];
  for (const items of attempts) {
    try {
      await writeClipboardItems(items);
      return { format: "mathml", message: "Copied: MathML", fallback: false };
    } catch {
      /* try next payload */
    }
  }
  return writeLatexFallback(latex, "MathML write failed");
}

/** Shared no-decoration bits for Word CF_HTML (Hyperlink style is stubborn). */
const NO_LINK_DECORATION =
  "text-decoration:none;border:none;border-bottom:none;outline:none;box-shadow:none;text-underline:none;";

/**
 * After the lowered equation run, Word otherwise keeps typing on the same
 * shifted / hyperlink character style. A real space (not ZWSP) reset run
 * restores 0pt baseline — Word swallows `&#8203;` so it never took effect.
 */
export const WORD_BASELINE_RESET_SPAN =
  '<span style="vertical-align:0pt;mso-text-raise:0pt;text-decoration:none;color:windowtext;"> </span>';

/**
 * Word HTML → OOXML baseline shift.
 * Early desktop Word tests only lowered the image when `vertical-align:-Xpt`
 * lived on the `<a>` (not solely on `<img>`). `mso-text-raise` maps to
 * `<w:position>` so Office consistently lowers the run.
 */
export function wordBaselineShiftStyle(depthPt: number): string {
  if (!(depthPt > 0) || !Number.isFinite(depthPt)) return "";
  const x = Number(depthPt.toFixed(2));
  return `vertical-align:-${x}pt;mso-text-raise:-${x}pt;`;
}

/** Escape LaTeX for use in HTML attribute values (`alt`). */
export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export type InlinePngHtmlOptions = {
  /**
   * When true (default for "plain image" pref), emit span+img only — no `<a>`.
   * When false, wrap img in `<a href="#eq=…">` for click-back round-trip.
   */
  plainImageNoLink?: boolean;
};

/**
 * Pure inline equation markup — shifted span (+ optional a) + img.
 * Always keeps pt size, baseline shift, and LaTeX in `alt`.
 */
export function buildInlinePngEquationHtml(
  latex: string,
  raster: RasterResult,
  options: InlinePngHtmlOptions = {},
): string {
  const plainImageNoLink = options.plainImageNoLink !== false;
  const href = buildEqHref(latex).replace(/"/g, "&quot;");
  const widthPt = raster.widthPt > 0 ? raster.widthPt : Math.round(raster.cssWidth * 0.75 * 100) / 100;
  const heightPt = raster.heightPt > 0 ? raster.heightPt : Math.round(raster.cssHeight * 0.75 * 100) / 100;
  const widthPx = Math.max(1, Math.round(raster.cssWidth));
  const heightPx = Math.max(1, Math.round(raster.cssHeight));
  const shift = wordBaselineShiftStyle(raster.baselinePt);
  const alt = escapeHtmlAttr(latex);

  const imgStyle =
    `width:${widthPt}pt;height:${heightPt}pt;${shift}` +
    `${NO_LINK_DECORATION}display:inline;`;
  const img =
    `<img border="0" src="${raster.dataUrl}" width="${widthPx}" height="${heightPx}" ` +
    `style="${imgStyle}" alt="${alt}" />`;

  const spanStyle = `${shift}${NO_LINK_DECORATION}color:windowtext;`;

  if (plainImageNoLink) {
    // No hyperlink wrapper — Word will not paint blue underline / hover tip.
    return `<span style="${spanStyle}">${img}</span>`;
  }

  const anchorStyle = `${shift}${NO_LINK_DECORATION}color:windowtext;`;
  return `<span style="${spanStyle}"><a href="${href}" style="${anchorStyle}">${img}</a></span>`;
}

/**
 * Payload for `ClipboardItem` `text/html`: **inline-only** string.
 *
 * Do **not** wrap in `<html>` / `<body>` or hand-write `<!--StartFragment-->` —
 * on Windows, Chromium already builds CF_HTML around the blob; a second manual
 * document wrapper makes Word insert a trailing paragraph break.
 *
 * Content = equation span (depth shift) + real-space 0pt reset span, no newlines.
 */
export function wrapPngForWord(
  latex: string,
  raster: RasterResult,
  options: InlinePngHtmlOptions = {},
): string {
  return `${buildInlinePngEquationHtml(latex, raster, options)}${WORD_BASELINE_RESET_SPAN}`;
}

export async function copyPng(
  latex: string,
  scale: number = DEFAULT_EXPORT_SCALE,
  options: InlinePngHtmlOptions = {},
): Promise<ClipboardExportResult> {
  if (!latex.trim()) throw new Error("Nothing to copy");
  if (!canUseClipboardItems()) {
    return writeLatexFallback(latex, "no ClipboardItem");
  }
  try {
    const raster = await renderFormulaPng(latex, scale);
    if (raster.width < 2 || raster.height < 2 || raster.blob.size < 32) {
      throw new Error("PNG empty");
    }
    const plain = options.plainImageNoLink !== false;
    // Inline-only HTML string — Chromium wraps CF_HTML; no hand-built document.
    const html = wrapPngForWord(latex, raster, { plainImageNoLink: plain });
    // HTML-only: a sibling image/png makes Word paste the raw 4× bitmap and
    // ignore CF_HTML pt sizing + vertical-align / mso-text-raise.
    await writeClipboardItems({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([latex], { type: "text/plain" }),
    });
    const linkNote = plain ? "plain img" : "#eq= link";
    return {
      format: "png",
      message: `Copied: PNG (${scale}x, ${raster.width}×${raster.height}, shift -${raster.baselinePt}pt, ${linkNote})`,
      fallback: false,
    };
  } catch {
    return writeLatexFallback(latex, "PNG write failed");
  }
}

export async function copySvg(
  latex: string,
  scale: number = DEFAULT_EXPORT_SCALE,
): Promise<ClipboardExportResult> {
  if (!latex.trim()) throw new Error("Nothing to copy");
  if (!canUseClipboardItems()) {
    return writeLatexFallback(latex, "no ClipboardItem");
  }
  try {
    const { svg, blob } = await renderFormulaSvg(latex, scale);
    if (!svg.includes("<svg") || blob.size < 32) throw new Error("SVG empty");
    const html = `<!DOCTYPE html><html><body>${svg}</body></html>`;
    await writeClipboardItems({
      "image/svg+xml": blob,
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([svg], { type: "text/plain" }),
    });
    return { format: "svg", message: "Copied: SVG", fallback: false };
  } catch {
    try {
      const { svg } = await renderFormulaSvg(latex, scale);
      const html = `<!DOCTYPE html><html><body>${svg}</body></html>`;
      await writeClipboardItems({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([svg], { type: "text/plain" }),
      });
      return { format: "svg", message: "Copied: SVG (html)", fallback: false };
    } catch {
      return writeLatexFallback(latex, "SVG write failed");
    }
  }
}

export async function copyExport(
  format: ExportFormat,
  latex: string,
  options: InlinePngHtmlOptions = {},
): Promise<ClipboardExportResult> {
  switch (format) {
    case "mathml":
      return copyMathMl(latex);
    case "png":
      return copyPng(latex, DEFAULT_EXPORT_SCALE, options);
    case "svg":
      return copySvg(latex);
    case "latex":
      return copyLatex(latex);
  }
}
