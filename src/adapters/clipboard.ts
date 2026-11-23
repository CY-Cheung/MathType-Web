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
  // Chromium only accepts a small MIME allow-list on ClipboardItem.
  // Prefer text/html (Word reads the embedded MathML). Optionally add
  // application/mathml+xml when the browser accepts it.
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
  "text-decoration:none;border:none;border-bottom:none;outline:none;box-shadow:none;";

/**
 * Word applies `span.MsoHyperlink { text-decoration:underline }` on paste.
 * Override that character style in a head `<style>` (Office HTML idiom).
 */
const WORD_NO_UNDERLINE_STYLE = `<style><!--
a:link, a:visited, span.MsoHyperlink, span.MsoHyperlinkFollowed {
  color:windowtext; text-decoration:none; text-underline:none;
}
a img, span.MsoHyperlink img { border:none; text-decoration:none; }
--></style>`;

/**
 * SPEC: 4× PNG inside `<a href="…#eq=…">` with dynamic baseline offset.
 * Dimensions are style-only pt (no bare px width/height attrs) so Word does not
 * treat the 4× bitmap as the display size. Nested span + MsoHyperlink CSS
 * suppress the automatic hyperlink underline.
 */
export function wrapPngForWord(latex: string, raster: RasterResult): string {
  const href = buildEqHref(latex).replace(/"/g, "&quot;");
  const widthPt = raster.widthPt > 0 ? raster.widthPt : Math.round(raster.cssWidth * 0.75 * 100) / 100;
  const heightPt = raster.heightPt > 0 ? raster.heightPt : Math.round(raster.cssHeight * 0.75 * 100) / 100;
  const align =
    raster.baselinePt > 0
      ? `vertical-align:-${raster.baselinePt}pt;`
      : "vertical-align:baseline;";
  // Style-only sizing in pt — pixel width/height attrs make Word ignore pt and
  // (with a raw CF_PNG sibling) paste at 4× bitmap size, which also ruins baseline.
  const imgStyle =
    `width:${widthPt}pt;height:${heightPt}pt;${align}` +
    `${NO_LINK_DECORATION}text-underline:none;display:inline;`;
  const img =
    `<img border="0" src="${raster.dataUrl}" ` +
    `style="${imgStyle}" alt="equation" />`;
  const anchorStyle = `${NO_LINK_DECORATION}text-underline:none;color:windowtext;`;
  // Nested span: Word often restyles the <a> as span.MsoHyperlink on paste.
  const inner =
    `<span style="${NO_LINK_DECORATION}text-underline:none;color:windowtext;">${img}</span>`;
  return (
    `<!DOCTYPE html><html><head><meta charset="utf-8">${WORD_NO_UNDERLINE_STYLE}</head><body>` +
    `<a href="${href}" style="${anchorStyle}">${inner}</a>` +
    `</body></html>`
  );
}

export async function copyPng(
  latex: string,
  scale: number = DEFAULT_EXPORT_SCALE,
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
    const html = wrapPngForWord(latex, raster);
    // HTML-only for Word: a sibling image/png is pasted at native 4× pixels and
    // discards pt width/height + vertical-align (baseline floats, size blows up).
    await writeClipboardItems({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([latex], { type: "text/plain" }),
    });
    return {
      format: "png",
      message: `Copied: PNG (${scale}x, ${raster.width}×${raster.height}) + #eq=`,
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
    // Browsers rarely accept image/svg+xml on clipboard; also offer text + html.
    const html = `<!DOCTYPE html><html><body>${svg}</body></html>`;
    await writeClipboardItems({
      "image/svg+xml": blob,
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([svg], { type: "text/plain" }),
    });
    return { format: "svg", message: "Copied: SVG", fallback: false };
  } catch {
    // Some Chromium builds reject image/svg+xml — retry without that type.
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
): Promise<ClipboardExportResult> {
  switch (format) {
    case "mathml":
      return copyMathMl(latex);
    case "png":
      return copyPng(latex);
    case "svg":
      return copySvg(latex);
    case "latex":
      return copyLatex(latex);
  }
}
