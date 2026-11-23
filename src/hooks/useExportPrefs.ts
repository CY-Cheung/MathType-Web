import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_PLAIN_IMAGE_NO_LINK,
  readPlainImageNoLink,
  writePlainImageNoLink,
} from "../types/exportPrefs";

/**
 * Persist Word PNG paste prefs (plain image / no hyperlink wrapper).
 */
export function useExportPrefs() {
  const [plainImageNoLink, setPlainImageNoLinkState] = useState(
    DEFAULT_PLAIN_IMAGE_NO_LINK,
  );

  useEffect(() => {
    setPlainImageNoLinkState(readPlainImageNoLink());
  }, []);

  const setPlainImageNoLink = useCallback((value: boolean) => {
    writePlainImageNoLink(value);
    setPlainImageNoLinkState(value);
    return value;
  }, []);

  return { plainImageNoLink, setPlainImageNoLink };
}
