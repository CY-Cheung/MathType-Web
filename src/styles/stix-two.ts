/**
 * Self-hosted STIX Two Text / Math (SIL OFL) — Times-compatible open fallback.
 * Windows keeps real Times New Roman via local(); Android / missing-TNR
 * environments fall through to these `.woff2` faces under `public/fonts/`.
 * URLs use `import.meta.env.BASE_URL` for GitHub Pages (`/MathType-Web/`).
 * Stretchy MathLive delimiters stay on KaTeX metrics.
 */

const STYLE_ID = "mt-stix-two";

const LATIN_RANGE =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const GREEK_RANGE =
  "U+0370-0377,U+037A-037F,U+0384-038A,U+038C,U+038E-03A1,U+03A3-03FF";

type Face = {
  family: "STIX Two Text" | "STIX Two Math" | "Times New Roman";
  file: string;
  weight: "400" | "700";
  style: "normal" | "italic";
  unicodeRange?: string;
  locals?: string[];
};

/** Files also used for export-time Base64 `@font-face` embedding. */
export const STIX_TWO_EMBED_FILES = [
  "stix-two-text-latin-400-normal.woff2",
  "stix-two-text-latin-400-italic.woff2",
  "stix-two-text-latin-700-normal.woff2",
  "stix-two-text-latin-700-italic.woff2",
  "stix-two-text-greek-400-normal.woff2",
  "stix-two-text-greek-400-italic.woff2",
  "stix-two-text-greek-700-normal.woff2",
  "stix-two-text-greek-700-italic.woff2",
  "stix-two-math-latin-400-normal.woff2",
] as const;

const TEXT_FACES: Omit<Face, "family" | "locals">[] = [
  {
    file: "stix-two-text-latin-400-normal.woff2",
    weight: "400",
    style: "normal",
    unicodeRange: LATIN_RANGE,
  },
  {
    file: "stix-two-text-latin-400-italic.woff2",
    weight: "400",
    style: "italic",
    unicodeRange: LATIN_RANGE,
  },
  {
    file: "stix-two-text-latin-700-normal.woff2",
    weight: "700",
    style: "normal",
    unicodeRange: LATIN_RANGE,
  },
  {
    file: "stix-two-text-latin-700-italic.woff2",
    weight: "700",
    style: "italic",
    unicodeRange: LATIN_RANGE,
  },
  {
    file: "stix-two-text-greek-400-normal.woff2",
    weight: "400",
    style: "normal",
    unicodeRange: GREEK_RANGE,
  },
  {
    file: "stix-two-text-greek-400-italic.woff2",
    weight: "400",
    style: "italic",
    unicodeRange: GREEK_RANGE,
  },
  {
    file: "stix-two-text-greek-700-normal.woff2",
    weight: "700",
    style: "normal",
    unicodeRange: GREEK_RANGE,
  },
  {
    file: "stix-two-text-greek-700-italic.woff2",
    weight: "700",
    style: "italic",
    unicodeRange: GREEK_RANGE,
  },
];

const TNR_LOCALS: Record<string, string[]> = {
  "400:normal": ["Times New Roman", "TimesNewRomanPSMT"],
  "400:italic": ["Times New Roman Italic", "TimesNewRomanPS-ItalicMT"],
  "700:normal": ["Times New Roman Bold", "TimesNewRomanPS-BoldMT"],
  "700:italic": ["Times New Roman Bold Italic", "TimesNewRomanPS-BoldItalicMT"],
};

function faces(): Face[] {
  const stixText: Face[] = TEXT_FACES.map((face) => ({
    ...face,
    family: "STIX Two Text",
  }));
  const tnr: Face[] = TEXT_FACES.map((face) => ({
    ...face,
    family: "Times New Roman",
    locals: TNR_LOCALS[`${face.weight}:${face.style}`],
  }));
  const math: Face = {
    family: "STIX Two Math",
    file: "stix-two-math-latin-400-normal.woff2",
    weight: "400",
    style: "normal",
  };
  return [...stixText, ...tnr, math];
}

function faceRule(face: Face, base: string): string {
  const url = `${base}fonts/${face.file}`;
  const localSrc = (face.locals ?? []).map((name) => `local(${JSON.stringify(name)})`);
  const src = [
    ...localSrc,
    `url(${JSON.stringify(url)}) format("woff2")`,
  ].join(",\n    ");
  const range = face.unicodeRange
    ? `\n  unicode-range: ${face.unicodeRange};`
    : "";
  return `@font-face {
  font-family: ${JSON.stringify(face.family)};
  src:
    ${src};
  font-weight: ${face.weight};
  font-style: ${face.style};
  font-display: swap;${range}
}`;
}

/** Inject STIX Two (+ TNR→STIX intercept) once. Safe from main + export. */
export function ensureStixTwoFonts(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const base = import.meta.env.BASE_URL;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = faces()
    .map((face) => faceRule(face, base))
    .join("\n\n");
  document.head.appendChild(style);
}

function bytesToBase64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode(...view.subarray(i, i + chunk));
  }
  return btoa(binary);
}

let embedCssPromise: Promise<string> | null = null;

/**
 * Build `@font-face` rules with Base64 data-URIs for html-to-image
 * foreignObject capture (Android / no local TNR).
 */
export async function getStixTwoFontEmbedCss(): Promise<string> {
  if (typeof document === "undefined") return "";
  if (!embedCssPromise) {
    embedCssPromise = (async () => {
      ensureStixTwoFonts();
      const base = import.meta.env.BASE_URL;
      const dataUris = new Map<string, string>();
      await Promise.all(
        STIX_TWO_EMBED_FILES.map(async (file) => {
          const res = await fetch(`${base}fonts/${file}`);
          if (!res.ok) return;
          const b64 = bytesToBase64(await res.arrayBuffer());
          dataUris.set(file, `data:font/woff2;base64,${b64}`);
        }),
      );

      const rules: string[] = [];
      for (const face of faces()) {
        const data = dataUris.get(face.file);
        if (!data) continue;
        // Skip local() in embed CSS — foreignObject has no OS fonts.
        const range = face.unicodeRange
          ? `\n  unicode-range: ${face.unicodeRange};`
          : "";
        rules.push(`@font-face {
  font-family: ${JSON.stringify(face.family)};
  src: url(${JSON.stringify(data)}) format("woff2");
  font-weight: ${face.weight};
  font-style: ${face.style};
  font-display: swap;${range}
}`);
      }
      return rules.join("\n\n");
    })().catch(() => {
      embedCssPromise = null;
      return "";
    });
  }
  return embedCssPromise;
}
