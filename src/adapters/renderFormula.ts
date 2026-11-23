import { convertLatexToMarkup } from "mathlive";
import { toPng, toSvg } from "html-to-image";
import "mathlive/static.css";
import "./export-formula.css";
import { defaultStylePreset } from "../types/preset";

/** Physical 10pt export size (editor zoom is view-only). */
const EXPORT_FONT_PT = defaultStylePreset.fullPt;
const FONT_FAMILY = '"Times New Roman", "Liberation Serif", Times, serif';

/** Default PNG/SVG pixel scale for crisp paste into PPT / Canva. */
export const DEFAULT_EXPORT_SCALE = 3;

function waitForFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.ready) return Promise.resolve();
  return document.fonts.ready.then(() => undefined);
}

/** Off-screen MathLive markup at 10pt Times, ready for raster / SVG capture. */
export async function mountExportNode(latex: string): Promise<HTMLElement> {
  await waitForFonts();
  const host = document.createElement("div");
  host.setAttribute("data-mt-export-host", "1");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;z-index:-1;pointer-events:none;background:transparent;";
  const node = document.createElement("div");
  node.className = "mt-export-formula";
  node.style.cssText = [
    "display:inline-block",
    "padding:4px 6px",
    "margin:0",
    "background:transparent",
    `color:#000`,
    `font-family:${FONT_FAMILY}`,
    `font-size:${EXPORT_FONT_PT}pt`,
    "line-height:1.2",
    "white-space:nowrap",
  ].join(";");
  node.innerHTML = convertLatexToMarkup(latex, {
    defaultMode: "math",
    letterShapeStyle: "tex",
  });
  host.appendChild(node);
  document.body.appendChild(host);
  // Let layout + webfonts settle before measuring.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return node;
}

export function unmountExportNode(node: HTMLElement): void {
  node.parentElement?.remove();
}

export type RasterResult = {
  blob: Blob;
  width: number;
  height: number;
  scale: number;
};

export async function renderFormulaPng(
  latex: string,
  scale: number = DEFAULT_EXPORT_SCALE,
): Promise<RasterResult> {
  const node = await mountExportNode(latex);
  try {
    const dataUrl = await toPng(node, {
      pixelRatio: scale,
      backgroundColor: "transparent",
      cacheBust: true,
      style: { background: "transparent" },
    });
    const blob = await (await fetch(dataUrl)).blob();
    const img = await loadImage(dataUrl);
    return { blob, width: img.naturalWidth, height: img.naturalHeight, scale };
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
  if (dataUrl.includes(";base64,")) {
    return atob(payload);
  }
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
