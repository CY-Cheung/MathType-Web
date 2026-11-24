import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearDefineSizesPrefs,
  cloneSizeSlots,
  DEFAULT_DEFINE_SIZES,
  FACTORY_DEFINE_SIZES,
  normalizeDefineSizesPrefs,
  readDefineSizesPrefs,
  sizeSlotsToPresetFields,
  syncDefineSizesToRoot,
  writeDefineSizesPrefs,
  type DefineSizesPrefs,
} from "../types/defineSizes";

export function useDefineSizes() {
  const [prefs, setPrefs] = useState<DefineSizesPrefs>(() =>
    normalizeDefineSizesPrefs(null),
  );
  const skipWrite = useRef(true);

  useEffect(() => {
    const stored = readDefineSizesPrefs();
    setPrefs(stored);
    syncDefineSizesToRoot(stored);
  }, []);

  useEffect(() => {
    syncDefineSizesToRoot(prefs);
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    writeDefineSizesPrefs(prefs);
  }, [prefs]);

  const commit = useCallback((next: DefineSizesPrefs, persist = true) => {
    const normalized = normalizeDefineSizesPrefs(next);
    syncDefineSizesToRoot(normalized);
    setPrefs(normalized);
    if (persist) writeDefineSizesPrefs(normalized);
    skipWrite.current = true;
  }, []);

  const factoryReset = useCallback(() => {
    clearDefineSizesPrefs();
    const next: DefineSizesPrefs = {
      version: 1,
      slots: cloneSizeSlots(FACTORY_DEFINE_SIZES),
    };
    syncDefineSizesToRoot(next);
    setPrefs(next);
  }, []);

  return {
    prefs,
    commit,
    factoryReset,
    defaults: DEFAULT_DEFINE_SIZES,
    presetFields: sizeSlotsToPresetFields(prefs),
  };
}
