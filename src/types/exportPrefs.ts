/**
 * Word PNG paste preferences (clipboard HTML shape + raster scale).
 * Persisted separately from Define Styles / workspace zoom.
 */

export const PLAIN_IMAGE_NO_LINK_STORAGE_KEY = "mt-export-plain-image-no-link";
export const EXPORT_SCALE_STORAGE_KEY = "mt.exportScale.v1";

/** Default ON — Word paste without blue hyperlink underline. */
export const DEFAULT_PLAIN_IMAGE_NO_LINK = true;

/** Raster multipliers: 4×=384 DPI, 6×=576 DPI, 8×=768 DPI (vs 96). */
export const EXPORT_SCALE_PRESETS = [4, 6, 8] as const;
export type ExportScale = (typeof EXPORT_SCALE_PRESETS)[number];

/** Default 6× — sharper at Word 200% zoom than legacy 4×. */
export const DEFAULT_EXPORT_SCALE: ExportScale = 6;

export function isExportScale(value: unknown): value is ExportScale {
  return value === 4 || value === 6 || value === 8;
}

/** PNG pHYs DPI for a given scale (96 × scale). */
export function dpiForExportScale(scale: number): number {
  return Math.round(96 * scale);
}

export function readPlainImageNoLink(): boolean {
  if (typeof localStorage === "undefined") return DEFAULT_PLAIN_IMAGE_NO_LINK;
  try {
    const raw = localStorage.getItem(PLAIN_IMAGE_NO_LINK_STORAGE_KEY);
    if (raw == null || raw === "") return DEFAULT_PLAIN_IMAGE_NO_LINK;
    if (raw === "0" || raw === "false") return false;
    if (raw === "1" || raw === "true") return true;
    return DEFAULT_PLAIN_IMAGE_NO_LINK;
  } catch {
    return DEFAULT_PLAIN_IMAGE_NO_LINK;
  }
}

export function writePlainImageNoLink(value: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PLAIN_IMAGE_NO_LINK_STORAGE_KEY, value ? "true" : "false");
  } catch {
    /* private mode / quota */
  }
}

export function readExportScale(): ExportScale {
  if (typeof localStorage === "undefined") return DEFAULT_EXPORT_SCALE;
  try {
    const raw = localStorage.getItem(EXPORT_SCALE_STORAGE_KEY);
    if (raw == null || raw === "") return DEFAULT_EXPORT_SCALE;
    const n = Number(raw);
    return isExportScale(n) ? n : DEFAULT_EXPORT_SCALE;
  } catch {
    return DEFAULT_EXPORT_SCALE;
  }
}

export function writeExportScale(scale: ExportScale): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(EXPORT_SCALE_STORAGE_KEY, String(scale));
  } catch {
    /* private mode / quota */
  }
}
