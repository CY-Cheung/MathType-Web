import { useCallback, useEffect, useState } from "react";
import {
  clampWorkspaceZoomPercent,
  DEFAULT_WORKSPACE_ZOOM_PERCENT,
  readWorkspaceZoomPercent,
  writeWorkspaceZoomPercent,
} from "../types/workspaceZoom";

/**
 * Persist workspace view zoom in localStorage.
 * Does not affect PNG / Word export sizing (export stays at physical 10pt).
 */
export function useWorkspaceZoom() {
  const [zoomPercent, setZoomPercentState] = useState(DEFAULT_WORKSPACE_ZOOM_PERCENT);

  useEffect(() => {
    setZoomPercentState(readWorkspaceZoomPercent());
  }, []);

  const setZoomPercent = useCallback((value: number) => {
    const next = clampWorkspaceZoomPercent(value);
    setZoomPercentState(next);
    writeWorkspaceZoomPercent(next);
    return next;
  }, []);

  return { zoomPercent, setZoomPercent };
}
