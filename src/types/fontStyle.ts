/**
 * Math / Text face preferences for the editor canvas and 4× PNG export.
 * Persisted separately from the MathType size preset (10pt table).
 */

export type FontFaceId =
  | "times-new-roman"
  | "tex-gyre-termes"
  | "courier-new"
  | "pmingliu";

export type FontFaceOption = {
  id: FontFaceId;
  /** English label shown in the Style dialog. */
  label: string;
  /** Optional Chinese label (e.g. 新細明體). */
  labelZh?: string;
  /** Primary CSS font-family name. */
  family: string;
  /** Comma-separated fallbacks (no trailing generic). */
  fallbacks: string;
  generic: "serif" | "sans-serif" | "monospace";
};

/** Catalog offered in Style / Font Settings. */
export const FONT_FACE_OPTIONS: readonly FontFaceOption[] = [
  {
    id: "times-new-roman",
    label: "Times New Roman",
    family: "Times New Roman",
    fallbacks: '"TeX Gyre Termes", "Liberation Serif", Times',
    generic: "serif",
  },
  {
    id: "tex-gyre-termes",
    label: "TeX Gyre Termes",
    family: "TeX Gyre Termes",
    fallbacks: '"Times New Roman", "Liberation Serif", Times',
    generic: "serif",
  },
  {
    id: "courier-new",
    label: "Courier New",
    family: "Courier New",
    fallbacks: "Courier",
    generic: "monospace",
  },
  {
    id: "pmingliu",
    label: "PMingLiU",
    labelZh: "新細明體",
    family: "PMingLiU",
    fallbacks: '"新細明體", MingLiU, "Noto Serif TC"',
    generic: "serif",
  },
] as const;

export type FontStylePrefs = {
  version: 1;
  mathFontId: FontFaceId;
  textFontId: FontFaceId;
};

/** Math + Text both default to the Times / Termes stack (SPEC 10pt face). */
export const DEFAULT_FONT_STYLE: FontStylePrefs = {
  version: 1,
  mathFontId: "times-new-roman",
  textFontId: "times-new-roman",
};

export const FONT_STYLE_STORAGE_KEY = "mt.fontStyle.v1";

const FACE_BY_ID: ReadonlyMap<FontFaceId, FontFaceOption> = new Map(
  FONT_FACE_OPTIONS.map((option) => [option.id, option]),
);

export function isFontFaceId(value: unknown): value is FontFaceId {
  return typeof value === "string" && FACE_BY_ID.has(value as FontFaceId);
}

export function getFontFaceOption(id: FontFaceId): FontFaceOption {
  return FACE_BY_ID.get(id) ?? FONT_FACE_OPTIONS[0];
}

/** Full CSS `font-family` stack for a catalog id. */
export function cssFontStack(id: FontFaceId): string {
  const option = getFontFaceOption(id);
  return `"${option.family}", ${option.fallbacks}, ${option.generic}`;
}

export function fontFaceLabel(id: FontFaceId): string {
  const option = getFontFaceOption(id);
  return option.labelZh ? `${option.label} (${option.labelZh})` : option.label;
}

export function normalizeFontStylePrefs(raw: unknown): FontStylePrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_FONT_STYLE };
  const data = raw as Partial<FontStylePrefs>;
  return {
    version: 1,
    mathFontId: isFontFaceId(data.mathFontId) ? data.mathFontId : DEFAULT_FONT_STYLE.mathFontId,
    textFontId: isFontFaceId(data.textFontId) ? data.textFontId : DEFAULT_FONT_STYLE.textFontId,
  };
}

/** Sync read for non-React callers (4× PNG / SVG export). */
export function readFontStylePrefs(): FontStylePrefs {
  if (typeof localStorage === "undefined") return { ...DEFAULT_FONT_STYLE };
  try {
    const raw = localStorage.getItem(FONT_STYLE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FONT_STYLE };
    return normalizeFontStylePrefs(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_FONT_STYLE };
  }
}

export function writeFontStylePrefs(prefs: FontStylePrefs): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(FONT_STYLE_STORAGE_KEY, JSON.stringify(normalizeFontStylePrefs(prefs)));
}

export function clearFontStylePrefs(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(FONT_STYLE_STORAGE_KEY);
}

export function mathFontStackFrom(prefs: FontStylePrefs = readFontStylePrefs()): string {
  return cssFontStack(prefs.mathFontId);
}

export function textFontStackFrom(prefs: FontStylePrefs = readFontStylePrefs()): string {
  return cssFontStack(prefs.textFontId);
}

/** Canonical `:root` custom properties (toolbar / canvas / export all read these). */
export const MT_MATH_FONT_VAR = "--mt-math-font";
export const MT_TEXT_FONT_VAR = "--mt-text-font";

/**
 * Write Math / Text stacks onto an element (usually `:root`).
 * Also mirrors legacy aliases so older CSS (`--mt-math-font-family`, etc.) keeps working.
 */
export function applyFontStyleCssVars(
  target: HTMLElement,
  prefs: FontStylePrefs = readFontStylePrefs(),
): void {
  const math = mathFontStackFrom(prefs);
  const text = textFontStackFrom(prefs);
  const { style } = target;
  style.setProperty(MT_MATH_FONT_VAR, math);
  style.setProperty(MT_TEXT_FONT_VAR, text);
  // Aliases used by MathLive shadow / mathtype-10pt / export CSS.
  style.setProperty("--mt-math-font-family", math);
  style.setProperty("--mt-text-font-family", text);
  style.setProperty("--mt-font-family", math);
  style.setProperty("--text-font-family", text);
}

/** Sync prefs to `document.documentElement` (`:root`). Safe no-op off-DOM. */
export function syncFontStyleToRoot(prefs: FontStylePrefs = readFontStylePrefs()): void {
  if (typeof document === "undefined") return;
  applyFontStyleCssVars(document.documentElement, prefs);
}

/**
 * Stamp Math / Text stacks as inline CSS vars on an off-document export host
 * so html-to-image capture does not lose faces when the node is detached from
 * inherited `:root` styling quirks.
 */
export function fontStyleInlineVars(prefs: FontStylePrefs = readFontStylePrefs()): string {
  const math = mathFontStackFrom(prefs);
  const text = textFontStackFrom(prefs);
  return [
    `${MT_MATH_FONT_VAR}:${math}`,
    `${MT_TEXT_FONT_VAR}:${text}`,
    `--mt-math-font-family:${math}`,
    `--mt-text-font-family:${text}`,
    `--mt-font-family:${math}`,
    `--text-font-family:${text}`,
  ].join(";");
}

/** `document.fonts.load` specs for the active Math / Text faces. */
export function fontLoadSpecsFor(prefs: FontStylePrefs, sizePt = 10): string[] {
  const faces = new Set([
    getFontFaceOption(prefs.mathFontId).family,
    getFontFaceOption(prefs.textFontId).family,
  ]);
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
