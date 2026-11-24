import { convertLatexToMarkup } from "mathlive";
import { toPng, toSvg } from "html-to-image";
import "mathlive/static.css";
import { ensureTexGyreTermesFonts } from "../styles/tex-gyre-termes";
import "./export-formula.css";
import { MT_FONT_LOAD_SPECS, MT_FONT_STACK } from "../styles/fontStack";
import {
  defineSizesInlineVars,
  readDefineSizesPrefs,
  resolveSizeSlotPt,
} from "../types/defineSizes";
import {
  defineSpacingInlineVars,
  readDefineSpacingPrefs,
} from "../types/defineSpacing";
import {
  defineStylesInlineVars,
  fontLoadSpecsForDefineStyles,
  fontStackFor,
  readDefineStylesPrefs,
} from "../types/defineStyles";
import { prepareMatrixLatexForExport } from "../core/matrixFrac";
import { defaultStylePreset } from "../types/preset";
import {
  bytesToPngDataUrl,
  dataUrlToBytes,
  EXPORT_PNG_DPI,
  EXPORT_PNG_PIXELS_PER_METER,
  readPngPhysPpm,
  setPngPhysDpi,
} from "./pngPhys";

/**
 * Physical Full size for PNG / Word export (Define Sizes → Full).
 * Workspace Zoom (status-bar %) is view-only and must never feed this path —
 * clipboard baseline / pt sizing stay on Full pt regardless of 100–800% UI zoom.
 * True 4× / 384 DPI and negative baseline valign are unchanged.
 */
function exportFontPt(): number {
  try {
    return resolveSizeSlotPt(readDefineSizesPrefs(), "full");
  } catch {
    return defaultStylePreset.fullPt;
  }
}

/** SPEC Phase 2: 4× High-DPI PNG locked to physical 10pt (= 384 DPI vs 96). */
export const DEFAULT_EXPORT_SCALE = 4;

export { EXPORT_PNG_DPI, EXPORT_PNG_PIXELS_PER_METER };

/** CSS px → pt at 96 DPI (SPEC: depthPx * 0.75 → vertical-align pt). */
export const PX_TO_PT = 0.75;

/**
 * Word `vertical-align: -Xpt` clamps.
 * ~7pt is a typical simple-formula depth at 10pt; tall stacks are capped so the
 * image does not sink excessively below the body baseline.
 */
export const VALIGN_PT_MIN = 2;
export const VALIGN_PT_MAX = 20;
export const VALIGN_PT_REF = 7;

/** Convert CSS px to pt, two decimal places (Word HTML inline styles). */
export function pxToPt(px: number): number {
  return Math.round(Math.max(0, px) * PX_TO_PT * 100) / 100;
}

/**
 * Map measured depth (CSS px) → Word vertical-align magnitude in pt.
 * Returns 0 when depth is unknown / zero (caller may omit the negative offset).
 */
export function depthToValignPt(depthPx: number, heightPt = 0): number {
  if (!(depthPx > 0) || !Number.isFinite(depthPx)) return 0;
  const raw = pxToPt(depthPx);
  const heightCap = heightPt > 0 ? Math.max(VALIGN_PT_REF, heightPt * 0.55) : VALIGN_PT_MAX;
  const max = Math.min(VALIGN_PT_MAX, heightCap);
  const clamped = Math.min(max, Math.max(VALIGN_PT_MIN, raw));
  return Math.round(clamped * 100) / 100;
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
  const prefs = readDefineStylesPrefs();
  const fontPt = exportFontPt();
  const specs = [
    ...BASE_EXPORT_FONT_LOAD_SPECS,
    ...fontLoadSpecsForDefineStyles(prefs, fontPt),
  ];
  await Promise.all(specs.map((spec) => document.fonts.load(spec).catch(() => [] as FontFace[])));
}

/** Off-screen MathLive markup at Full pt, ready for raster / SVG capture. */
export async function mountExportNode(latex: string): Promise<HTMLElement> {
  await waitForFonts();
  const prefs = readDefineStylesPrefs();
  const sizePrefs = readDefineSizesPrefs();
  const spacingPrefs = readDefineSpacingPrefs();
  const fontPt = resolveSizeSlotPt(sizePrefs, "full");
  const mathFamily = fontStackFor(prefs.styles.variable.font) || MT_FONT_STACK;
  const host = document.createElement("div");
  host.setAttribute("data-mt-export-host", "1");
  // Inline line box at body Full pt so formula + baseline strut share one alphabetic
  // baseline (Word `vertical-align: -depth`). Avoid font-size:0 — it collapses the
  // strut and under-reports depth, which makes equations float above body text.
  host.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    "z-index:-1",
    "pointer-events:none",
    "background:transparent",
    "white-space:nowrap",
    "line-height:normal",
    `font-family:${mathFamily}`,
    `font-size:${fontPt}pt`,
  ].join(";");
  const node = document.createElement("span");
  node.className = "mt-export-formula";
  // No padding — padding inflated Word display size and skewed depth.
  // Inline Define Styles / Sizes / Spacing CSS vars so html-to-image keeps faces.
  node.style.cssText = [
    "display:inline-block",
    "padding:0",
    "margin:0",
    "border:0",
    "background:transparent",
    "color:#000",
    `font-family:${mathFamily}`,
    defineStylesInlineVars(prefs),
    defineSizesInlineVars(sizePrefs),
    defineSpacingInlineVars(spacingPrefs),
    `font-size:${fontPt}pt`,
    "line-height:normal",
    "vertical-align:baseline",
  ].join(";");
  // Matrix cells are textstyle — upgrade bare `\frac` → `\dfrac` and ensure
  // row skips so full-size numerators/denominators do not collide in Word PNG.
  const exportLatex = prepareMatrixLatexForExport(latex);
  node.innerHTML = convertLatexToMarkup(exportLatex, {
    defaultMode: "math",
    letterShapeStyle: "tex",
  });
  // Full-pt reference glyph "x" on the same line — Word body baseline proxy.
  // Depth = formula box bottom − reference bottom (fractions land ~5–8pt).
  const marker = document.createElement("span");
  marker.setAttribute("data-mt-baseline", "1");
  marker.textContent = "x";
  marker.style.cssText = [
    "display:inline",
    "padding:0",
    "margin:0",
    "border:0",
    "vertical-align:baseline",
    `font-family:${mathFamily}`,
    `font-size:${fontPt}pt`,
    "line-height:normal",
    "color:transparent",
    "user-select:none",
  ].join(";");
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
 * Depth below the body baseline in CSS px.
 * Used as Word `vertical-align` / `mso-text-raise: -Xpt`.
 *
 * Sources (max of available):
 * 1. MathLive `.ML__strut--bottom` TeX depth (em/px)
 * 2. Formula box bottom − sibling 10pt reference `x` bottom
 */
export function measureDepthPx(node: HTMLElement): number {
  const fontPx =
    parseFloat(getComputedStyle(node).fontSize) || exportFontPt() * (96 / 72);
  let strutDepth = 0;
  const mlStrut = node.querySelector(".ML__strut--bottom");
  if (mlStrut instanceof HTMLElement) {
    const va = mlStrut.style.verticalAlign || getComputedStyle(mlStrut).verticalAlign;
    const em = /^(-?[\d.]+)em$/i.exec(va.trim());
    if (em) {
      const depthEm = Math.abs(parseFloat(em[1]));
      if (Number.isFinite(depthEm) && depthEm > 0) strutDepth = depthEm * fontPx;
    } else {
      const px = /^(-?[\d.]+)px$/i.exec(va.trim());
      if (px) {
        const depth = Math.abs(parseFloat(px[1]));
        if (Number.isFinite(depth) && depth > 0) strutDepth = depth;
      }
    }
  }

  let refDepth = 0;
  const marker = node.parentElement?.querySelector("[data-mt-baseline]");
  if (marker instanceof HTMLElement) {
    refDepth = Math.max(
      0,
      node.getBoundingClientRect().bottom - marker.getBoundingClientRect().bottom,
    );
  }

  return Math.max(strutDepth, refDepth);
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
  /** Raw measured depth in CSS px (before clamp). */
  depthPx: number;
  /** `vertical-align: -Xpt` magnitude (depth below baseline, clamped). */
  baselinePt: number;
  /** PNG pHYs pixels/meter (x), after 384 DPI stamp; null if missing. */
  physPpm: number | null;
};

/**
 * Rasterize MathLive markup at true `scale`× (default 4) via html-to-image
 * `pixelRatio`, then stamp PNG `pHYs` at 384 DPI so Word does not treat the
 * bitmap as a 96 DPI screen grab and soft-downsample it.
 */
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
    const widthPt = pxToPt(cssWidth);
    const heightPt = pxToPt(cssHeight);
    // html-to-image sets canvas.width = (canvasWidth || width) * pixelRatio.
    // Pass CSS layout size + pixelRatio only — do NOT also pass canvasWidth×scale
    // or the bitmap becomes scale² (e.g. 16×). True 4× = vector draw at 4× DPR.
    const rawDataUrl = await toPng(node, {
      pixelRatio: scale,
      width: cssWidth,
      height: cssHeight,
      backgroundColor: "transparent",
      cacheBust: true,
      style: {
        background: "transparent",
        transform: "none",
        width: `${cssWidth}px`,
        height: `${cssHeight}px`,
      },
    });
    const stamped = setPngPhysDpi(dataUrlToBytes(rawDataUrl), EXPORT_PNG_DPI);
    const dataUrl = bytesToPngDataUrl(stamped);
    const blob = new Blob([stamped.buffer.slice(stamped.byteOffset, stamped.byteOffset + stamped.byteLength) as ArrayBuffer], {
      type: "image/png",
    });
    const img = await loadImage(dataUrl);
    return {
      blob,
      dataUrl,
      width: img.naturalWidth,
      height: img.naturalHeight,
      cssWidth,
      cssHeight,
      widthPt,
      heightPt,
      scale,
      depthPx,
      baselinePt: depthToValignPt(depthPx, heightPt),
      physPpm: readPngPhysPpm(stamped),
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
