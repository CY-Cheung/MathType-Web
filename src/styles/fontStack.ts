/**
 * UI + math letters: Windows prefers real Times New Roman;
 * Android / missing-TNR falls through to self-hosted STIX Two Text (SIL OFL).
 * Keep this string exact — shadow/export CSS assert fontFamily starts with it.
 * STIX Two Math is a deeper fallback for stray unicode ops (KaTeX stretchy untouched).
 */
export const MT_FONT_STACK =
  '"Times New Roman", "STIX Two Text", serif';

/** Faces to warm via document.fonts.load before high-DPI PNG export. */
export const MT_FONT_LOAD_SPECS = [
  '10pt "STIX Two Text"',
  'italic 10pt "STIX Two Text"',
  'bold 10pt "STIX Two Text"',
  'italic bold 10pt "STIX Two Text"',
  '10pt "STIX Two Math"',
] as const;
