/** UI + math letters: Windows prefers real TNR; Termes is the cross-platform fallback. */
export const MT_FONT_STACK =
  '"Times New Roman", "TeX Gyre Termes", "Liberation Serif", Times, serif';

/** Faces to warm via document.fonts.load before 4× PNG export. */
export const MT_FONT_LOAD_SPECS = [
  '10pt "TeX Gyre Termes"',
  'italic 10pt "TeX Gyre Termes"',
  'bold 10pt "TeX Gyre Termes"',
  'italic bold 10pt "TeX Gyre Termes"',
] as const;
