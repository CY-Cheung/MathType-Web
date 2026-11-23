import { convertLatexToMarkup } from "mathlive";
import { toPng, toSvg } from "html-to-image";
import "mathlive/static.css";
import { ensureTexGyreTermesFonts } from "../styles/tex-gyre-termes";
import "./export-formula.css";
import { MT_FONT_LOAD_SPECS, MT_FONT_STACK } from "../styles/fontStack";
import {
  fontLoadSpecsFor,
  fontStyleInlineVars,
  mathFontStackFrom,
  readFontStylePrefs,
} from "../types/fontStyle";
import { defaultStylePreset } from "../types/preset";

/** Physical 10pt export size (editor zoom is view-only). */
const EXPORT_FONT_PT = defaultStylePreset.fullPt;

/** SPEC Phase 2: 4× High-DPI PNG locked to physical 10pt. */
export const DEFAULT_EXPORT_SCALE = 4;

/** CSS px → pt at 96 DPI (SPEC: depthPx * 0.75 → vertical-align pt). */
export const PX_TO_PT = 0.75;

/** Convert CSS px to pt, two decimal places (Word HTML inline styles). */
export function pxToPt(px: number): number {
  return Math.round(Math.max(0, px) * PX_TO_PT * 100) / 100;
}

/** Always warm Termes (+ TNR intercept) so Times defaults stay cross-platform. */
const BASE_EXPORT_FONT_LOAD_SPECS = [
  ...MT_FONT_LOAD_SPECS,
  '10pt "Times New Roman"',
  'italic 10pt "Times New Roman"',
  'bold 10pt "Times New Roman"',
  'italic bold 10pt "Times New Roman"',
] as const;

async function waitForFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  ensureTexGyreTermesFonts();
  await document.fonts.ready;
  const prefs = readFontStylePrefs();
  const specs = [...BASE_EXPORT_FONT_LOAD_SPECS, ...fontLoadSpecsFor(prefs, EXPORT_FONT_PT)];
  await Promise.all(specs.map((spec) => document.fonts.load(spec).catch(() => [] as FontFace[])));
}

/** Off-screen MathLive markup at 10pt, ready for raster / SVG capture. */
export async function mountExportNode(latex: string): Promise<HTMLElement> {
  await waitForFonts();
  const prefs = readFontStylePrefs();
  const mathFamily = mathFontStackFrom(prefs) || MT_FONT_STACK;
  const host = document.createElement("div");
  host.setAttribute("data-mt-export-host", "1");
  // Inline line box so formula + baseline strut share one baseline (Word depth).
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;z-index:-1;pointer-events:none;background:transparent;white-space:nowrap;line-height:normal;font-size:0;";
  const node = document.createElement("span");
  node.className = "mt-export-formula";
  // No padding — padding inflated Word display size and skewed depth.
  // Inline --mt-math-font / --mt-text-font so html-to-image keeps faces even
  // when the off-screen host does not inherit live :root updates reliably.
  node.style.cssText = [
    "display:inline-block",
    "padding:0",
    "margin:0",
    "border:0",
    "background:transparent",
    "color:#000",
    `font-family:${mathFamily}`,
    fontStyleInlineVars(prefs),
    `font-size:${EXPORT_FONT_PT}pt`,
    "line-height:normal",
    "vertical-align:baseline",
  ].join(";");
  node.innerHTML = convertLatexToMarkup(latex, {
    defaultMode: "math",
    letterShapeStyle: "tex",
  });
  const marker = document.createElement("span");
  marker.setAttribute("data-mt-baseline", "1");
  marker.textContent = "\u200b";
  marker.style.cssText =
    "display:inline-block;width:0;height:0;overflow:hidden;vertical-align:baseline;font-size:0;line-height:0;";
  host.appendChild(node);
  host.appendChild(marker);
  document.body.appendChild(host);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return node;
}

export function unmountExportNode(node: HTMLElement): void {
  node.parentElement?.remove();
}

/**
 * Depth below the math baseline in CSS px (formula box bottom − strut).
 * Used as Word `vertical-align: -Xpt` so the equals / math axis lines up
 * with surrounding body text.
 */
export function measureDepthPx(node: HTMLElement): number {
  const marker = node.parentElement?.querySelector("[data-mt-baseline]");
  if (!(marker instanceof HTMLElement)) return 0;
  const depth = node.getBoundingClientRect().bottom - marker.getBoundingClientRect().bottom;
  return Math.max(0, depth);
}

export type RasterResult = {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  /** CSS display size in px (10pt face), not the 4× bitmap size. */
  cssWidth: number;
  cssHeight: number;
  /** Display size in pt for Word HTML `width`/`height` styles. */
  widthPt: number;
  heightPt: number;
  scale: number;
  /** `vertical-align: -Xpt` magnitude (depth below baseline). */
  baselinePt: number;
};

export async function renderFormulaPng(
  latex: string,
  scale: number = DEFAULT_EXPORT_SCALE,
): Promise<RasterResult> {
  const node = await mountExportNode(latex);
  try {
    const rect = node.getBoundingClientRect();
    const depthPx = measureDepthPx(node);
    // Prefer fractional px → pt for Word; keep integer px attrs for CF_HTML.
    const cssWidth = Math.max(1, rect.width);
    const cssHeight = Math.max(1, rect.height);
    const dataUrl = await toPng(node, {
      pixelRatio: scale,
      backgroundColor: "transparent",
      cacheBust: true,
      style: { background: "transparent" },
    });
    const blob = await (await fetch(dataUrl)).blob();
    const img = await loadImage(dataUrl);
    return {
      blob,
      dataUrl,
      width: img.naturalWidth,
      height: img.naturalHeight,
      cssWidth,
      cssHeight,
      widthPt: pxToPt(cssWidth),
      heightPt: pxToPt(cssHeight),
      scale,
      baselinePt: pxToPt(depthPx),
    };
  } finally {
    unmountExportNode(node);
  }
}

export async function renderFormulaSvg(
  latex: string,
  scale: number = DEFAULT_EXPORT_SCALE,
): Promise<{ svg: string; blob: Blob }> {
  const node = await mountExportNode(latex);
  try {
    const dataUrl = await toSvg(node, {
      pixelRatio: scale,
      backgroundColor: "transparent",
      cacheBust: true,
      style: { background: "transparent" },
    });
    const svg = decodeSvgDataUrl(dataUrl);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    return { svg, blob };
  } finally {
    unmountExportNode(node);
  }
}

function decodeSvgDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  if (dataUrl.includes(";base64,")) return atob(payload);
  return decodeURIComponent(payload);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("PNG decode failed"));
    img.src = src;
  });
}
