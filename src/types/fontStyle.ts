/**
 * Compatibility shim — Define Styles (v2) supersedes the PR #10 Math/Text-only prefs.
 */

export {
  clearDefineStylesPrefs as clearFontStylePrefs,
  defineStylesInlineVars as fontStyleInlineVars,
  fontLoadSpecsForDefineStyles as fontLoadSpecsFor,
  fontStackFor as cssFontStack,
  readDefineStylesPrefs as readFontStylePrefs,
  syncDefineStylesToRoot as syncFontStyleToRoot,
  writeDefineStylesPrefs as writeFontStylePrefs,
  type DefineStylesPrefs as FontStylePrefs,
} from "./defineStyles";

import {
  fontStackFor,
  readDefineStylesPrefs,
  type DefineStylesPrefs,
} from "./defineStyles";

/** @deprecated Prefer Variable style via Define Styles. */
export function mathFontStackFrom(prefs?: DefineStylesPrefs): string {
  const p = prefs ?? readDefineStylesPrefs();
  return fontStackFor(p.styles.variable.font);
}

/** @deprecated Prefer Text + Text (FE) via Define Styles. */
export function textFontStackFrom(prefs?: DefineStylesPrefs): string {
  const p = prefs ?? readDefineStylesPrefs();
  return `${fontStackFor(p.styles.text.font)}, ${fontStackFor(p.styles.textFe.font)}`;
}
