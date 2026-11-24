import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_EXPORT_SCALE,
  DEFAULT_PLAIN_IMAGE_NO_LINK,
  dpiForExportScale,
  isExportScale,
  readExportScale,
  readPlainImageNoLink,
  writeExportScale,
  writePlainImageNoLink,
  type ExportScale,
} from "../types/exportPrefs";

/**
 * Persist Word PNG paste prefs (plain image / no hyperlink + raster scale).
 */
export function useExportPrefs() {
  const [plainImageNoLink, setPlainImageNoLinkState] = useState(
    DEFAULT_PLAIN_IMAGE_NO_LINK,
  );
  const [exportScale, setExportScaleState] = useState<ExportScale>(
    DEFAULT_EXPORT_SCALE,
  );

  useEffect(() => {
    setPlainImageNoLinkState(readPlainImageNoLink());
    setExportScaleState(readExportScale());
  }, []);

  const setPlainImageNoLink = useCallback((value: boolean) => {
    writePlainImageNoLink(value);
    setPlainImageNoLinkState(value);
    return value;
  }, []);

  const setExportScale = useCallback((value: ExportScale) => {
    const next = isExportScale(value) ? value : DEFAULT_EXPORT_SCALE;
    writeExportScale(next);
    setExportScaleState(next);
    return next;
  }, []);

  return {
    plainImageNoLink,
    setPlainImageNoLink,
    exportScale,
    setExportScale,
    exportDpi: dpiForExportScale(exportScale),
  };
}
