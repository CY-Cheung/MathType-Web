import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearFontStylePrefs,
  DEFAULT_FONT_STYLE,
  mathFontStackFrom,
  normalizeFontStylePrefs,
  readFontStylePrefs,
  syncFontStyleToRoot,
  textFontStackFrom,
  writeFontStylePrefs,
  type FontFaceId,
  type FontStylePrefs,
} from "../types/fontStyle";

/**
 * Persist Math / Text face prefs in localStorage, sync `:root` CSS vars on every
 * change (including Reset), and expose CSS stacks for the editor + export path.
 */
export function useFontStyle() {
  const [prefs, setPrefs] = useState<FontStylePrefs>(() => ({ ...DEFAULT_FONT_STYLE }));
  const skipWrite = useRef(true);

  useEffect(() => {
    const stored = readFontStylePrefs();
    setPrefs(stored);
    syncFontStyleToRoot(stored);
  }, []);

  useEffect(() => {
    // Always mirror React state → `:root` (covers first paint after hydrate + reset).
    syncFontStyleToRoot(prefs);
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    writeFontStylePrefs(prefs);
  }, [prefs]);

  const setMathFontId = useCallback((mathFontId: FontFaceId) => {
    setPrefs((current) => normalizeFontStylePrefs({ ...current, mathFontId }));
  }, []);

  const setTextFontId = useCallback((textFontId: FontFaceId) => {
    setPrefs((current) => normalizeFontStylePrefs({ ...current, textFontId }));
  }, []);

  const reset = useCallback(() => {
    clearFontStylePrefs();
    const next = { ...DEFAULT_FONT_STYLE };
    syncFontStyleToRoot(next);
    setPrefs(next);
  }, []);

  const mathFontStack = useMemo(() => mathFontStackFrom(prefs), [prefs]);
  const textFontStack = useMemo(() => textFontStackFrom(prefs), [prefs]);

  return {
    prefs,
    mathFontStack,
    textFontStack,
    setMathFontId,
    setTextFontId,
    reset,
  };
}
