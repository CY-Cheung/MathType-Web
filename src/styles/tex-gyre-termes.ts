/**
 * Self-hosted TeX Gyre Termes (GUST) — optional Times-compatible face
 * for Define Styles when the user picks “TeX Gyre Termes”.
 * Default letter stack prefers Times New Roman → STIX Two Text (see stix-two.ts).
 * Stretchy MathLive glyphs stay on KaTeX.
 */

const STYLE_ID = "mt-tex-gyre-termes";

type Face = {
  family: "TeX Gyre Termes";
  file: string;
  weight: "400" | "700";
  style: "normal" | "italic";
};

const FACES: Face[] = [
  { family: "TeX Gyre Termes", file: "texgyretermes-regular.otf", weight: "400", style: "normal" },
  { family: "TeX Gyre Termes", file: "texgyretermes-italic.otf", weight: "400", style: "italic" },
  { family: "TeX Gyre Termes", file: "texgyretermes-bold.otf", weight: "700", style: "normal" },
  { family: "TeX Gyre Termes", file: "texgyretermes-bolditalic.otf", weight: "700", style: "italic" },
];

function faceRule(face: Face, base: string): string {
  const url = `${base}fonts/${face.file}`;
  return `@font-face {
  font-family: ${JSON.stringify(face.family)};
  src: url(${JSON.stringify(url)}) format("opentype");
  font-weight: ${face.weight};
  font-style: ${face.style};
  font-display: swap;
}`;
}

/** Inject TeX Gyre Termes @font-face rules once (idempotent). */
export function ensureTexGyreTermesFonts(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const base = import.meta.env.BASE_URL;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = FACES.map((face) => faceRule(face, base)).join("\n\n");
  document.head.appendChild(style);
}
