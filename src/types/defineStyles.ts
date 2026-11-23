/**
 * MathType-style Define Styles (12 faces + Bold/Italic).
 * Persisted in localStorage; synced to :root CSS vars for canvas / toolbar / export.
 */

export type DefineStyleId =
  | "text"
  | "textFe"
  | "function"
  | "variable"
  | "lcGreek"
  | "ucGreek"
  | "symbol"
  | "vectorMatrix"
  | "number"
  | "extraMath"
  | "user1"
  | "user2";

export type StyleFace = {
  /** Primary CSS font-family name (may be a custom local face). */
  font: string;
  bold: boolean;
  italic: boolean;
};

export type DefineStylesMode = "simple" | "advanced";

export type DefineStylesPrefs = {
  version: 2;
  mode: DefineStylesMode;
  styles: Record<DefineStyleId, StyleFace>;
};

export type DefineStyleMeta = {
  id: DefineStyleId;
  label: string;
  /** Short hint under the label. */
  hint?: string;
};

/** Advanced-mode row order (MathType Define Styles). */
export const DEFINE_STYLE_ORDER: readonly DefineStyleMeta[] = [
  { id: "text", label: "Text" },
  { id: "textFe", label: "Text (FE)", hint: "Far East / 中日韓" },
  { id: "function", label: "Function" },
  { id: "variable", label: "Variable" },
  { id: "lcGreek", label: "L.C. Greek" },
  { id: "ucGreek", label: "U.C. Greek" },
  { id: "symbol", label: "Symbol" },
  { id: "vectorMatrix", label: "Vector-Matrix" },
  { id: "number", label: "Number" },
  { id: "extraMath", label: "Extra Math" },
  { id: "user1", label: "User 1" },
  { id: "user2", label: "User 2" },
] as const;

/** Common faces offered in the Font `<select>` (Custom… for free-form names). */
export const COMMON_FONT_PRESETS: readonly string[] = [
  "Times New Roman",
  "TeX Gyre Termes",
  "PMingLiU",
  "MingLiU",
  "新細明體",
  "Symbol",
  "MT Extra",
  "Courier New",
  "Arial",
  "Calibri",
  "Cambria Math",
  "Segoe UI Symbol",
  "Georgia",
] as const;

/** Sentinel value for the Custom… option in Font `<select>`. */
export const CUSTOM_FONT_OPTION = "__custom__";

function face(font: string, bold = false, italic = false): StyleFace {
  return { font, bold, italic };
}

/** Factory defaults matching MathType 6.9b Define Styles. */
export const FACTORY_DEFINE_STYLES: Record<DefineStyleId, StyleFace> = {
  text: face("Times New Roman"),
  textFe: face("PMingLiU"),
  function: face("Times New Roman"),
  variable: face("Times New Roman", false, true),
  lcGreek: face("Symbol", false, true),
  ucGreek: face("Symbol", false, true),
  symbol: face("Symbol"),
  vectorMatrix: face("Times New Roman", true, false),
  number: face("Times New Roman"),
  extraMath: face("MT Extra"),
  user1: face("Courier New"),
  user2: face("Times New Roman"),
};

export const DEFINE_STYLES_STORAGE_KEY = "mt.defineStyles.v2";
/** Legacy Math/Text-only prefs from PR #10 — migrated once on read. */
const LEGACY_FONT_STYLE_KEY = "mt.fontStyle.v1";

const STYLE_IDS = new Set<DefineStyleId>(DEFINE_STYLE_ORDER.map((row) => row.id));

export function isDefineStyleId(value: unknown): value is DefineStyleId {
  return typeof value === "string" && STYLE_IDS.has(value as DefineStyleId);
}

/** Fallbacks after the primary face name. */
export function fontStackFor(font: string): string {
  const name = font.trim() || "Times New Roman";
  const lower = name.toLowerCase();
  if (lower === "times new roman" || lower === "tex gyre termes") {
    return `"${name}", "TeX Gyre Termes", "Times New Roman", "Liberation Serif", Times, serif`;
  }
  if (lower === "courier new" || lower === "courier") {
    return `"${name}", Courier, monospace`;
  }
  if (lower === "pmingliu" || name === "新細明體" || lower === "mingliu") {
    return `"${name}", "PMingLiU", "新細明體", MingLiU, "Noto Serif TC", serif`;
  }
  if (lower === "symbol" || lower.includes("symbol")) {
    return `"${name}", Symbol, "Segoe UI Symbol", "Cambria Math", serif`;
  }
  if (lower === "mt extra" || lower.includes("extra")) {
    return `"${name}", "MT Extra", "Segoe UI Symbol", Symbol, serif`;
  }
  return `"${name}", "Times New Roman", "TeX Gyre Termes", serif`;
}

export function cssWeight(bold: boolean): string {
  return bold ? "700" : "400";
}

export function cssStyle(italic: boolean): string {
  return italic ? "italic" : "normal";
}

function normalizeFace(raw: unknown, fallback: StyleFace): StyleFace {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const data = raw as Partial<StyleFace>;
  const font = typeof data.font === "string" && data.font.trim() ? data.font.trim() : fallback.font;
  return {
    font,
    bold: typeof data.bold === "boolean" ? data.bold : fallback.bold,
    italic: typeof data.italic === "boolean" ? data.italic : fallback.italic,
  };
}

export function cloneStyles(
  styles: Record<DefineStyleId, StyleFace>,
): Record<DefineStyleId, StyleFace> {
  const next = {} as Record<DefineStyleId, StyleFace>;
  for (const id of STYLE_IDS) {
    next[id] = { ...styles[id] };
  }
  return next;
}

export const DEFAULT_DEFINE_STYLES: DefineStylesPrefs = {
  version: 2,
  mode: "advanced",
  styles: cloneStyles(FACTORY_DEFINE_STYLES),
};

export function normalizeDefineStylesPrefs(raw: unknown): DefineStylesPrefs {
  if (!raw || typeof raw !== "object") {
    return {
      version: 2,
      mode: DEFAULT_DEFINE_STYLES.mode,
      styles: cloneStyles(FACTORY_DEFINE_STYLES),
    };
  }
  const data = raw as Partial<DefineStylesPrefs> & {
    mathFontId?: string;
    textFontId?: string;
  };

  // Migrate PR #10 v1 { mathFontId, textFontId }.
  if (data.version !== 2 && (data.mathFontId || data.textFontId)) {
    const styles = cloneStyles(FACTORY_DEFINE_STYLES);
    const mathName = legacyFaceName(data.mathFontId);
    const textName = legacyFaceName(data.textFontId) ?? mathName;
    if (mathName) {
      for (const id of ["variable", "function", "number", "vectorMatrix", "user2"] as const) {
        styles[id] = { ...styles[id], font: mathName };
      }
    }
    if (textName) {
      styles.text = { ...styles.text, font: textName };
    }
    return { version: 2, mode: "advanced", styles };
  }

  const styles = cloneStyles(FACTORY_DEFINE_STYLES);
  if (data.styles && typeof data.styles === "object") {
    for (const id of STYLE_IDS) {
      styles[id] = normalizeFace(
        (data.styles as Record<string, unknown>)[id],
        FACTORY_DEFINE_STYLES[id],
      );
    }
  }
  return {
    version: 2,
    mode: data.mode === "simple" ? "simple" : "advanced",
    styles,
  };
}

function legacyFaceName(id: unknown): string | null {
  switch (id) {
    case "times-new-roman":
      return "Times New Roman";
    case "tex-gyre-termes":
      return "TeX Gyre Termes";
    case "courier-new":
      return "Courier New";
    case "pmingliu":
      return "PMingLiU";
    default:
      return null;
  }
}

export function readDefineStylesPrefs(): DefineStylesPrefs {
  if (typeof localStorage === "undefined") {
    return normalizeDefineStylesPrefs(null);
  }
  try {
    const raw = localStorage.getItem(DEFINE_STYLES_STORAGE_KEY);
    if (raw) return normalizeDefineStylesPrefs(JSON.parse(raw) as unknown);
    const legacy = localStorage.getItem(LEGACY_FONT_STYLE_KEY);
    if (legacy) {
      const migrated = normalizeDefineStylesPrefs(JSON.parse(legacy) as unknown);
      writeDefineStylesPrefs(migrated);
      return migrated;
    }
  } catch {
    /* fall through */
  }
  return normalizeDefineStylesPrefs(null);
}

export function writeDefineStylesPrefs(prefs: DefineStylesPrefs): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(DEFINE_STYLES_STORAGE_KEY, JSON.stringify(normalizeDefineStylesPrefs(prefs)));
}

export function clearDefineStylesPrefs(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(DEFINE_STYLES_STORAGE_KEY);
}

/** Apply Primary font (Simple mode) onto the main math letter faces. */
export function applyPrimaryFont(
  styles: Record<DefineStyleId, StyleFace>,
  primary: StyleFace,
): Record<DefineStyleId, StyleFace> {
  const next = cloneStyles(styles);
  for (const id of ["variable", "function", "number", "vectorMatrix"] as const) {
    next[id] = {
      ...next[id],
      font: primary.font,
      // Simple Primary bold/italic drives Variable; others keep factory BI flags.
      ...(id === "variable" ? { bold: primary.bold, italic: primary.italic } : {}),
    };
  }
  return next;
}

export type StyleCssBundle = {
  font: string;
  weight: string;
  style: string;
};

export function styleCssBundle(face: StyleFace): StyleCssBundle {
  return {
    font: fontStackFor(face.font),
    weight: cssWeight(face.bold),
    style: cssStyle(face.italic),
  };
}

/** CSS custom-property names for one Define Style slot. */
export function styleVarNames(id: DefineStyleId): {
  font: string;
  weight: string;
  style: string;
} {
  return {
    font: `--mt-ds-${id}-font`,
    weight: `--mt-ds-${id}-weight`,
    style: `--mt-ds-${id}-style`,
  };
}

/**
 * Write all Define Styles onto an element (usually `:root`).
 * Also mirrors legacy `--mt-math-font` / `--mt-text-font` for older CSS.
 */
export function applyDefineStylesCssVars(
  target: HTMLElement,
  prefs: DefineStylesPrefs = readDefineStylesPrefs(),
): void {
  const { style } = target;
  for (const id of STYLE_IDS) {
    const face = prefs.styles[id];
    const names = styleVarNames(id);
    const bundle = styleCssBundle(face);
    style.setProperty(names.font, bundle.font);
    style.setProperty(names.weight, bundle.weight);
    style.setProperty(names.style, bundle.style);
  }

  const variable = styleCssBundle(prefs.styles.variable);
  const text = styleCssBundle(prefs.styles.text);
  const textFe = styleCssBundle(prefs.styles.textFe);
  // Legacy aliases (PR #10) — Variable ≈ Math, Text ≈ Text.
  style.setProperty("--mt-math-font", variable.font);
  style.setProperty("--mt-text-font", `${text.font}, ${textFe.font}`);
  style.setProperty("--mt-math-font-family", variable.font);
  style.setProperty("--mt-text-font-family", `${text.font}, ${textFe.font}`);
  style.setProperty("--mt-font-family", variable.font);
  style.setProperty("--text-font-family", text.font);
  style.setProperty("--mt-text-weight", text.weight);
  style.setProperty("--mt-text-style", text.style);
}

export function syncDefineStylesToRoot(
  prefs: DefineStylesPrefs = readDefineStylesPrefs(),
): void {
  if (typeof document === "undefined") return;
  applyDefineStylesCssVars(document.documentElement, prefs);
}

/** Inline CSS vars for off-screen export hosts (html-to-image). */
export function defineStylesInlineVars(
  prefs: DefineStylesPrefs = readDefineStylesPrefs(),
): string {
  const parts: string[] = [];
  for (const id of STYLE_IDS) {
    const face = prefs.styles[id];
    const names = styleVarNames(id);
    const bundle = styleCssBundle(face);
    parts.push(`${names.font}:${bundle.font}`);
    parts.push(`${names.weight}:${bundle.weight}`);
    parts.push(`${names.style}:${bundle.style}`);
  }
  const variable = styleCssBundle(prefs.styles.variable);
  const text = styleCssBundle(prefs.styles.text);
  const textFe = styleCssBundle(prefs.styles.textFe);
  parts.push(`--mt-math-font:${variable.font}`);
  parts.push(`--mt-text-font:${text.font}, ${textFe.font}`);
  parts.push(`--mt-math-font-family:${variable.font}`);
  parts.push(`--mt-text-font-family:${text.font}, ${textFe.font}`);
  parts.push(`--mt-font-family:${variable.font}`);
  parts.push(`--text-font-family:${text.font}`);
  parts.push(`--mt-text-weight:${text.weight}`);
  parts.push(`--mt-text-style:${text.style}`);
  return parts.join(";");
}

export function fontLoadSpecsForDefineStyles(
  prefs: DefineStylesPrefs,
  sizePt = 10,
): string[] {
  const faces = new Set<string>();
  for (const id of STYLE_IDS) {
    faces.add(prefs.styles[id].font);
  }
  const specs: string[] = [];
  for (const family of faces) {
    specs.push(
      `${sizePt}pt "${family}"`,
      `italic ${sizePt}pt "${family}"`,
      `bold ${sizePt}pt "${family}"`,
      `italic bold ${sizePt}pt "${family}"`,
    );
  }
  return specs;
}

/** Shared MathLive / markup CSS that maps classes → Define Styles vars. */
export function buildDefineStylesMappedCss(scopePrefix = ""): string {
  const p = scopePrefix;
  return `
${p}.ML__text,
${p}.ML__text .ML__mathit,
${p}.ML__text .ML__mathbf,
${p}.ML__text .ML__cmr {
  font-family: var(--mt-ds-text-font), var(--mt-ds-textFe-font), sans-serif !important;
  font-weight: var(--mt-ds-text-weight, 400) !important;
  font-style: var(--mt-ds-text-style, normal) !important;
}
${p}.ML__mathit {
  font-family: var(--mt-ds-variable-font, var(--mt-math-font)) !important;
  font-weight: var(--mt-ds-variable-weight, 400) !important;
  font-style: var(--mt-ds-variable-style, italic) !important;
}
${p}.ML__mathbf,
${p}.ML__mathbfit {
  font-family: var(--mt-ds-vectorMatrix-font, var(--mt-math-font)) !important;
  font-weight: var(--mt-ds-vectorMatrix-weight, 700) !important;
  font-style: var(--mt-ds-vectorMatrix-style, normal) !important;
}
${p}.ML__op-group .ML__cmr,
${p}.mt-ds-fn,
${p}.mt-ds-fn .ML__cmr,
${p}.mt-ds-fn .ML__mathit {
  font-family: var(--mt-ds-function-font, var(--mt-math-font)) !important;
  font-weight: var(--mt-ds-function-weight, 400) !important;
  font-style: var(--mt-ds-function-style, normal) !important;
}
${p}.ML__cmr {
  font-family: var(--mt-ds-number-font, var(--mt-math-font)) !important;
  font-weight: var(--mt-ds-number-weight, 400) !important;
  font-style: var(--mt-ds-number-style, normal) !important;
}
${p}.ML__tt,
${p}.mt-ds-user1,
${p}.mt-ds-user1 .ML__cmr,
${p}.mt-ds-user1 .ML__tt {
  font-family: var(--mt-ds-user1-font, "Courier New", monospace) !important;
  font-weight: var(--mt-ds-user1-weight, 400) !important;
  font-style: var(--mt-ds-user1-style, normal) !important;
}
${p}.mt-ds-user2,
${p}.mt-ds-user2 .ML__cmr,
${p}.mt-ds-user2 .ML__mathit {
  font-family: var(--mt-ds-user2-font, var(--mt-math-font)) !important;
  font-weight: var(--mt-ds-user2-weight, 400) !important;
  font-style: var(--mt-ds-user2-style, normal) !important;
}
${p}.lcGreek,
${p}.lcGreek.ML__mathit,
${p}.lcGreek.ML__mathbf,
${p}.mt-ds-lcGreek,
${p}.mt-ds-lcGreek .ML__mathit,
${p}.mt-ds-lcGreek .ML__cmr {
  font-family: var(--mt-ds-lcGreek-font, Symbol, serif) !important;
  font-weight: var(--mt-ds-lcGreek-weight, 400) !important;
  font-style: var(--mt-ds-lcGreek-style, italic) !important;
}
${p}.mt-ds-ucGreek,
${p}.mt-ds-ucGreek .ML__mathit,
${p}.mt-ds-ucGreek .ML__cmr,
${p}.mt-ds-ucGreek .ML__mathbf {
  font-family: var(--mt-ds-ucGreek-font, Symbol, serif) !important;
  font-weight: var(--mt-ds-ucGreek-weight, 400) !important;
  font-style: var(--mt-ds-ucGreek-style, italic) !important;
}
${p}.ML__content-placeholder {
  font-family: var(--mt-ds-variable-font, var(--mt-math-font)) !important;
}
/* Kill MathLive focused-text / contains-highlight wash (gray boxes on Text). */
${p}.ML__text,
${p}.ML__focused .ML__text,
${p}.ML__contains-highlight,
${p}.ML__focused .ML__contains-highlight {
  background: transparent !important;
  background-color: transparent !important;
}
`.trim();
}
