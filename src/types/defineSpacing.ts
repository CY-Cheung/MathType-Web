/**
 * MathType-style Define Spacing prefs (line / fraction / matrix gaps).
 */

/** v2 — roomier factory matrix gaps (1.0 / 1.2em). */
export const DEFINE_SPACING_STORAGE_KEY = "mt.defineSpacing.v2";

export type DefineSpacingPrefs = {
  version: 1;
  /** Em multiples of Full size. */
  lineSpacingEm: number;
  numeratorGapEm: number;
  denominatorGapEm: number;
  matrixRowGapEm: number;
  matrixColGapEm: number;
};

export const FACTORY_DEFINE_SPACING: DefineSpacingPrefs = {
  version: 1,
  lineSpacingEm: 1.2,
  numeratorGapEm: 0.1,
  denominatorGapEm: 0.1,
  /** MathType-like airy matrix rows (was 0.5 — felt cramped vs desktop). */
  matrixRowGapEm: 1.0,
  /** Inter-column air; CSS maps onto `.ML__arraycolsep`. */
  matrixColGapEm: 1.2,
};

export const DEFAULT_DEFINE_SPACING: DefineSpacingPrefs = {
  ...FACTORY_DEFINE_SPACING,
};

function clampEm(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(4, Math.max(0, Math.round(value * 100) / 100));
}

export function normalizeDefineSpacingPrefs(
  raw: Partial<DefineSpacingPrefs> | null | undefined,
): DefineSpacingPrefs {
  return {
    version: 1,
    lineSpacingEm: clampEm(
      raw?.lineSpacingEm ?? FACTORY_DEFINE_SPACING.lineSpacingEm,
      FACTORY_DEFINE_SPACING.lineSpacingEm,
    ),
    numeratorGapEm: clampEm(
      raw?.numeratorGapEm ?? FACTORY_DEFINE_SPACING.numeratorGapEm,
      FACTORY_DEFINE_SPACING.numeratorGapEm,
    ),
    denominatorGapEm: clampEm(
      raw?.denominatorGapEm ?? FACTORY_DEFINE_SPACING.denominatorGapEm,
      FACTORY_DEFINE_SPACING.denominatorGapEm,
    ),
    matrixRowGapEm: clampEm(
      raw?.matrixRowGapEm ?? FACTORY_DEFINE_SPACING.matrixRowGapEm,
      FACTORY_DEFINE_SPACING.matrixRowGapEm,
    ),
    matrixColGapEm: clampEm(
      raw?.matrixColGapEm ?? FACTORY_DEFINE_SPACING.matrixColGapEm,
      FACTORY_DEFINE_SPACING.matrixColGapEm,
    ),
  };
}

export function syncDefineSpacingToRoot(prefs: DefineSpacingPrefs): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--mt-line-spacing", String(prefs.lineSpacingEm));
  root.style.setProperty("--mt-num-gap", `${prefs.numeratorGapEm}em`);
  root.style.setProperty("--mt-den-gap", `${prefs.denominatorGapEm}em`);
  root.style.setProperty("--mt-matrix-row-gap", `${prefs.matrixRowGapEm}em`);
  root.style.setProperty("--mt-matrix-col-gap", `${prefs.matrixColGapEm}em`);
}

/** Inline CSS vars for off-screen PNG/SVG export hosts. */
export function defineSpacingInlineVars(prefs: DefineSpacingPrefs): string {
  return [
    `--mt-line-spacing:${prefs.lineSpacingEm}`,
    `--mt-num-gap:${prefs.numeratorGapEm}em`,
    `--mt-den-gap:${prefs.denominatorGapEm}em`,
    `--mt-matrix-row-gap:${prefs.matrixRowGapEm}em`,
    `--mt-matrix-col-gap:${prefs.matrixColGapEm}em`,
  ].join(";");
}

export function readDefineSpacingPrefs(): DefineSpacingPrefs {
  if (typeof localStorage === "undefined") {
    return normalizeDefineSpacingPrefs(null);
  }
  try {
    const raw = localStorage.getItem(DEFINE_SPACING_STORAGE_KEY);
    if (!raw) return normalizeDefineSpacingPrefs(null);
    return normalizeDefineSpacingPrefs(JSON.parse(raw) as DefineSpacingPrefs);
  } catch {
    return normalizeDefineSpacingPrefs(null);
  }
}

export function writeDefineSpacingPrefs(prefs: DefineSpacingPrefs): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      DEFINE_SPACING_STORAGE_KEY,
      JSON.stringify(normalizeDefineSpacingPrefs(prefs)),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearDefineSpacingPrefs(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(DEFINE_SPACING_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
