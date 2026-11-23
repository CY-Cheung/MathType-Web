/**
 * Workspace view zoom (MathType-style). Display-only — PNG / Word export always
 * rasterizes at physical Full size (10pt), independent of this percentage.
 */

export const WORKSPACE_ZOOM_STORAGE_KEY = "mt-workspace-zoom-percent";

/** MathType 6.9b common presets; 200% is the historical default. */
export const WORKSPACE_ZOOM_PRESETS = [100, 150, 200, 300, 400] as const;

export type WorkspaceZoomPreset = (typeof WORKSPACE_ZOOM_PRESETS)[number];

export const DEFAULT_WORKSPACE_ZOOM_PERCENT = 200;

export const WORKSPACE_ZOOM_MIN = 50;
export const WORKSPACE_ZOOM_MAX = 800;

export function clampWorkspaceZoomPercent(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_WORKSPACE_ZOOM_PERCENT;
  const rounded = Math.round(value);
  return Math.min(WORKSPACE_ZOOM_MAX, Math.max(WORKSPACE_ZOOM_MIN, rounded));
}

export function isWorkspaceZoomPreset(value: number): value is WorkspaceZoomPreset {
  return (WORKSPACE_ZOOM_PRESETS as readonly number[]).includes(value);
}

export function readWorkspaceZoomPercent(): number {
  if (typeof localStorage === "undefined") return DEFAULT_WORKSPACE_ZOOM_PERCENT;
  try {
    const raw = localStorage.getItem(WORKSPACE_ZOOM_STORAGE_KEY);
    if (raw == null || raw === "") return DEFAULT_WORKSPACE_ZOOM_PERCENT;
    return clampWorkspaceZoomPercent(Number(raw));
  } catch {
    return DEFAULT_WORKSPACE_ZOOM_PERCENT;
  }
}

export function writeWorkspaceZoomPercent(percent: number): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      WORKSPACE_ZOOM_STORAGE_KEY,
      String(clampWorkspaceZoomPercent(percent)),
    );
  } catch {
    /* private mode / quota */
  }
}
