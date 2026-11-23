import { convertLatexToMathMl } from "mathlive";
import {
  DEFAULT_EXPORT_SCALE,
  renderFormulaPng,
  renderFormulaSvg,
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

export async function copyPng(
  latex: string,
  scale: number = DEFAULT_EXPORT_SCALE,
): Promise<ClipboardExportResult> {
  if (!latex.trim()) throw new Error("Nothing to copy");
  if (!canUseClipboardItems()) {
    return writeLatexFallback(latex, "no ClipboardItem");
  }
  try {
    const { blob, width, height } = await renderFormulaPng(latex, scale);
    if (width < 2 || height < 2 || blob.size < 32) {
      throw new Error("PNG empty");
    }
    await writeClipboardItems({
      "image/png": blob,
      "text/plain": new Blob([latex], { type: "text/plain" }),
    });
    return {
      format: "png",
      message: `Copied: PNG (${scale}x, ${width}×${height})`,
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
