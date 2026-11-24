import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearDefineSpacingPrefs,
  DEFAULT_DEFINE_SPACING,
  FACTORY_DEFINE_SPACING,
  normalizeDefineSpacingPrefs,
  readDefineSpacingPrefs,
  syncDefineSpacingToRoot,
  writeDefineSpacingPrefs,
  type DefineSpacingPrefs,
} from "../types/defineSpacing";

export function useDefineSpacing() {
  const [prefs, setPrefs] = useState<DefineSpacingPrefs>(() =>
    normalizeDefineSpacingPrefs(null),
  );
  const skipWrite = useRef(true);

  useEffect(() => {
    const stored = readDefineSpacingPrefs();
    setPrefs(stored);
    syncDefineSpacingToRoot(stored);
  }, []);

  useEffect(() => {
    syncDefineSpacingToRoot(prefs);
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    writeDefineSpacingPrefs(prefs);
  }, [prefs]);

  const commit = useCallback((next: DefineSpacingPrefs, persist = true) => {
    const normalized = normalizeDefineSpacingPrefs(next);
    syncDefineSpacingToRoot(normalized);
    setPrefs(normalized);
    if (persist) writeDefineSpacingPrefs(normalized);
    skipWrite.current = true;
  }, []);

  const factoryReset = useCallback(() => {
    clearDefineSpacingPrefs();
    const next = { ...FACTORY_DEFINE_SPACING };
    syncDefineSpacingToRoot(next);
    setPrefs(next);
  }, []);

  return {
    prefs,
    commit,
    factoryReset,
    defaults: DEFAULT_DEFINE_SPACING,
  };
}
