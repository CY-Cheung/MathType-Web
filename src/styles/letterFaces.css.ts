/**
 * Force MathLive letter spans off KaTeX_Math / KaTeX_Main / Symbol.
 * Shared by shadow DOM injection, export host, and toolbar markup.
 *
 * Rules read live `--mt-ds-*-font` CSS vars from Define Styles
 * (`fontStackFor`): Euclid → `"Euclid", "Times New Roman", "STIX Two Text", …`;
 * Times New Roman → `"Times New Roman", "STIX Two Text", serif`. Defaults stay TNR.
 * Stretchy delimiters / large ops stay on KaTeX faces (untouched selectors).
 */

import { MT_FONT_STACK } from "./fontStack";

/** Default letter stack when Define Styles vars are unset (still TNR → STIX). */
export const LETTER_FONT_STACK = MT_FONT_STACK;

/**
 * High-specificity !important rules. Append AFTER Define Styles mapped CSS
 * so Unicode Greek (`.lcGreek`) cannot stay on Symbol → CM-looking fallbacks.
 * Family values come from CSS vars — selecting Euclid in Define Styles updates
 * `--mt-ds-variable-font` / `--mt-ds-lcGreek-font` without rebuilding this sheet.
 */
export function buildLetterFaceForceCss(scopePrefix = ""): string {
  const p = scopePrefix;
  return `
/* --- Letter faces follow Define Styles vars (never KaTeX_Math) --- */
${p}.ML__mathit,
${p}.ML__mathbfit,
${p}.ML__main {
  font-family: var(--mt-ds-variable-font, ${LETTER_FONT_STACK}) !important;
}
${p}.ML__cmr {
  font-family: var(--mt-ds-number-font, var(--mt-ds-variable-font, ${LETTER_FONT_STACK})) !important;
}
/* Unicode Greek: MathLive marks \\theta/\\alpha as .lcGreek — not Symbol encoding. */
${p}.lcGreek,
${p}.lcGreek.ML__mathit,
${p}.lcGreek.ML__mathbf,
${p}.mt-ds-lcGreek,
${p}.mt-ds-lcGreek .ML__mathit,
${p}.mt-ds-lcGreek .ML__cmr {
  font-family: var(--mt-ds-lcGreek-font, var(--mt-ds-variable-font, ${LETTER_FONT_STACK})) !important;
}
${p}.ucGreek,
${p}.ucGreek.ML__mathit,
${p}.ucGreek.ML__mathbf,
${p}.mt-ds-ucGreek,
${p}.mt-ds-ucGreek .ML__mathit,
${p}.mt-ds-ucGreek .ML__cmr,
${p}.mt-ds-ucGreek .ML__mathbf {
  font-family: var(--mt-ds-ucGreek-font, var(--mt-ds-variable-font, ${LETTER_FONT_STACK})) !important;
}
`.trim();
}
