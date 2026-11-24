/**
 * UI + math letters: Windows prefers real Times New Roman;
 * Android / missing-TNR falls through to self-hosted STIX Two Text (SIL OFL).
 * STIX Two Math covers unicode operators without replacing KaTeX stretchy metrics.
 */
export const MT_FONT_STACK =
  '"Times New Roman", "STIX Two Text", "STIX Two Math", serif';

/** Faces to warm via document.fonts.load before high-DPI PNG export. */
export const MT_FONT_LOAD_SPECS = [
  '10pt "STIX Two Text"',
  'italic 10pt "STIX Two Text"',
  'bold 10pt "STIX Two Text"',
  'italic bold 10pt "STIX Two Text"',
  '10pt "STIX Two Math"',
] as const;
