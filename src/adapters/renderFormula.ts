import { convertLatexToMarkup } from "mathlive";
import { toPng, toSvg } from "html-to-image";
import "mathlive/static.css";
import { ensureTexGyreTermesFonts } from "../styles/tex-gyre-termes";
import "./export-formula.css";
import { MT_FONT_LOAD_SPECS, MT_FONT_STACK } from "../styles/fontStack";
import { defaultStylePreset } from "../types/preset";

/** Physical 10pt export size (editor zoom is view-only). */
const EXPORT_FONT_PT = defaultStylePreset.fullPt;
const FONT_FAMILY = MT_FONT_STACK;

/** SPEC Phase 2: 4× High-DPI PNG locked to physical 10pt. */
export const DEFAULT_EXPORT_SCALE = 4;

/** CSS px → pt (SPEC: depthPx * 0.75 → vertical-align pt). */
export const PX_TO_PT = 0.75;

/** Warm both the named Termes face and the TNR local()+url intercept. */
const EXPORT_FONT_LOAD_SPECS = [
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
  await Promise.all(
    EXPORT_FONT_LOAD_SPECS.map((spec) =>
      document.fonts.load(spec).catch(() => [] as FontFace[]),
    ),
  );
}

/** Off-screen MathLive markup at 10pt Times, ready for raster / SVG capture. */
export async function mountExportNode(latex: string): Promise<HTMLElement> {
  await waitForFonts();
  const host = document.createElement("div");
  host.setAttribute("data-mt-export-host", "1");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;z-index:-1;pointer-events:none;background:transparent;white-space:nowrap;";
  const node = document.createElement("span");
  node.className = "mt-export-formula";
  node.style.cssText = [
    "display:inline-block",
    "padding:4px 6px",
    "margin:0",
    "background:transparent",
    "color:#000",
    `font-family:${FONT_FAMILY}`,
    `font-size:${EXPORT_FONT_PT}pt`,
    "line-height:1.2",
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
    "display:inline-block;width:0;height:0;overflow:hidden;vertical-align:baseline;";
  host.appendChild(node);
  host.appendChild(marker);
  document.body.appendChild(host);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return node;
}

export function unmountExportNode(node: HTMLElement): void {
  node.parentElement?.remove();
}

/** Depth below baseline in CSS px (formula bottom − baseline marker). */
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
  /** CSS display size (10pt), not the 4× bitmap size. */
  cssWidth: number;
  cssHeight: number;
  scale: number;
  /** `vertical-align: -Xpt` magnitude from SPEC px×0.75. */
  baselinePt: number;
};

export async function renderFormulaPng(
  latex: string,
  scale: number = DEFAULT_EXPORT_SCALE,
): Promise<RasterResult> {
  const node = await mountExportNode(latex);
  try {
    const depthPx = measureDepthPx(node);
    const cssWidth = Math.max(1, Math.ceil(node.getBoundingClientRect().width));
    const cssHeight = Math.max(1, Math.ceil(node.getBoundingClientRect().height));
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
      scale,
      baselinePt: Math.round(depthPx * PX_TO_PT * 100) / 100,
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
