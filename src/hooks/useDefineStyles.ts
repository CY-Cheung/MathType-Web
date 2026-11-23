import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearDefineStylesPrefs,
  cloneStyles,
  DEFAULT_DEFINE_STYLES,
  FACTORY_DEFINE_STYLES,
  normalizeDefineStylesPrefs,
  readDefineStylesPrefs,
  syncDefineStylesToRoot,
  writeDefineStylesPrefs,
  type DefineStylesPrefs,
} from "../types/defineStyles";

/**
 * Persist Define Styles prefs, sync `:root` CSS vars on every committed change,
 * and expose helpers for the Define Styles dialog (draft Apply / OK / Cancel).
 */
export function useDefineStyles() {
  const [prefs, setPrefs] = useState<DefineStylesPrefs>(() =>
    normalizeDefineStylesPrefs(null),
  );
  const skipWrite = useRef(true);

  useEffect(() => {
    const stored = readDefineStylesPrefs();
    setPrefs(stored);
    syncDefineStylesToRoot(stored);
  }, []);

  useEffect(() => {
    syncDefineStylesToRoot(prefs);
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    writeDefineStylesPrefs(prefs);
  }, [prefs]);

  const commit = useCallback((next: DefineStylesPrefs, persist = true) => {
    const normalized = normalizeDefineStylesPrefs(next);
    syncDefineStylesToRoot(normalized);
    setPrefs(normalized);
    // MathType "Use for new equations": persist only when checked.
    if (persist) writeDefineStylesPrefs(normalized);
    skipWrite.current = true;
  }, []);

  const factoryReset = useCallback(() => {
    clearDefineStylesPrefs();
    const next: DefineStylesPrefs = {
      version: 2,
      mode: prefs.mode,
      styles: cloneStyles(FACTORY_DEFINE_STYLES),
    };
    syncDefineStylesToRoot(next);
    setPrefs(next);
  }, [prefs.mode]);

  return {
    prefs,
    commit,
    factoryReset,
    defaults: DEFAULT_DEFINE_STYLES,
  };
}
