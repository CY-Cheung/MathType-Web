/**
 * Self-hosted TeX Gyre Termes (GUST) — Times-compatible face.
 * URLs are prefixed with `import.meta.env.BASE_URL` so GitHub Pages
 * (`/MathType-Web/`) and local preview both resolve `public/fonts/`.
 * Stretchy MathLive glyphs stay on KaTeX.
 */

const STYLE_ID = "mt-tex-gyre-termes";

type Face = {
  family: "TeX Gyre Termes" | "Times New Roman";
  file: string;
  weight: "400" | "700";
  style: "normal" | "italic";
  /** Optional local() faces tried before the self-hosted file (Windows TNR). */
  locals?: string[];
};

const FACES: Face[] = [
  { family: "TeX Gyre Termes", file: "texgyretermes-regular.otf", weight: "400", style: "normal" },
  { family: "TeX Gyre Termes", file: "texgyretermes-italic.otf", weight: "400", style: "italic" },
  { family: "TeX Gyre Termes", file: "texgyretermes-bold.otf", weight: "700", style: "normal" },
  { family: "TeX Gyre Termes", file: "texgyretermes-bolditalic.otf", weight: "700", style: "italic" },
  {
    family: "Times New Roman",
    file: "texgyretermes-regular.otf",
    weight: "400",
    style: "normal",
    locals: ["Times New Roman", "TimesNewRomanPSMT"],
  },
  {
    family: "Times New Roman",
    file: "texgyretermes-italic.otf",
    weight: "400",
    style: "italic",
    locals: ["Times New Roman Italic", "TimesNewRomanPS-ItalicMT"],
  },
  {
    family: "Times New Roman",
    file: "texgyretermes-bold.otf",
    weight: "700",
    style: "normal",
    locals: ["Times New Roman Bold", "TimesNewRomanPS-BoldMT"],
  },
  {
    family: "Times New Roman",
    file: "texgyretermes-bolditalic.otf",
    weight: "700",
    style: "italic",
    locals: ["Times New Roman Bold Italic", "TimesNewRomanPS-BoldItalicMT"],
  },
];

function faceRule(face: Face, base: string): string {
  const url = `${base}fonts/${face.file}`;
  const localSrc = (face.locals ?? []).map((name) => `local(${JSON.stringify(name)})`);
  const src = [...localSrc, `url(${JSON.stringify(url)}) format("opentype")`].join(",\n    ");
  return `@font-face {
  font-family: ${JSON.stringify(face.family)};
  src:
    ${src};
  font-weight: ${face.weight};
  font-style: ${face.style};
  font-display: swap;
}`;
}

/** Inject @font-face rules once (idempotent). Safe to call from main + export path. */
export function ensureTexGyreTermesFonts(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const base = import.meta.env.BASE_URL;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = FACES.map((face) => faceRule(face, base)).join("\n\n");
  document.head.appendChild(style);
}
