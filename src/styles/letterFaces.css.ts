/**
 * Force MathLive letter spans off KaTeX_Math / KaTeX_Main / Symbol.
 * Shared by shadow DOM injection, export host, and toolbar markup.
 *
 * Stretchy delimiters / large ops stay on KaTeX faces (untouched selectors).
 */

import { MT_FONT_STACK } from "./fontStack";

/** Exact letter stack — shadow/export asserts fontFamily starts with this. */
export const LETTER_FONT_STACK = MT_FONT_STACK;

/**
 * High-specificity !important rules. Append AFTER Define Styles mapped CSS
 * so Unicode Greek (`.lcGreek`) cannot stay on Symbol → CM-looking fallbacks.
 */
export function buildLetterFaceForceCss(scopePrefix = ""): string {
  const p = scopePrefix;
  return `
/* --- Letter faces: Times New Roman → STIX Two Text (never KaTeX_Math) --- */
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
