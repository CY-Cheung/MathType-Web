/**
 * MathType-style Define Sizes prefs (Full / Script / Symbol slots).
 * Persisted separately from Define Styles / Spacing.
 */

import { defaultStylePreset } from "./preset";

export const DEFINE_SIZES_STORAGE_KEY = "mt.defineSizes.v1";

export type SizeSlotId =
  | "full"
  | "script"
  | "scriptScript"
  | "symbol"
  | "subSymbol";

export type SizeSlotValue = {
  /** Absolute points, or percent of Full when `unit === "%"`. */
  value: number;
  unit: "pt" | "%";
};

export type DefineSizesPrefs = {
  version: 1;
  slots: Record<SizeSlotId, SizeSlotValue>;
};

export const DEFINE_SIZE_ORDER: readonly {
  id: SizeSlotId;
  label: string;
}[] = [
  { id: "full", label: "Full" },
  { id: "script", label: "Subscript/Superscript" },
  { id: "scriptScript", label: "Sub-Subscript/Superscript" },
  { id: "symbol", label: "Symbol" },
  { id: "subSymbol", label: "Sub-Symbol" },
] as const;

export const FACTORY_DEFINE_SIZES: Record<SizeSlotId, SizeSlotValue> = {
  full: { value: defaultStylePreset.fullPt, unit: "pt" },
  script: { value: defaultStylePreset.subSupPt, unit: "pt" },
  scriptScript: { value: defaultStylePreset.subSubSupPt, unit: "pt" },
  symbol: { value: defaultStylePreset.symbolPt, unit: "pt" },
  subSymbol: { value: defaultStylePreset.subSymbolPt, unit: "pt" },
};

export const DEFAULT_DEFINE_SIZES: DefineSizesPrefs = {
  version: 1,
  slots: { ...FACTORY_DEFINE_SIZES },
};

function clampSlot(slot: SizeSlotValue, id: SizeSlotId): SizeSlotValue {
  const unit = slot.unit === "%" ? "%" : "pt";
  let value = Number(slot.value);
  if (!Number.isFinite(value) || value <= 0) {
    return { ...FACTORY_DEFINE_SIZES[id] };
  }
  if (unit === "%") {
    value = Math.min(400, Math.max(10, Math.round(value)));
  } else {
    value = Math.min(72, Math.max(4, Math.round(value * 100) / 100));
  }
  // Full is always absolute pt in MathType.
  if (id === "full") return { value, unit: "pt" };
  return { value, unit };
}

export function cloneSizeSlots(
  slots: Record<SizeSlotId, SizeSlotValue>,
): Record<SizeSlotId, SizeSlotValue> {
  return {
    full: { ...slots.full },
    script: { ...slots.script },
    scriptScript: { ...slots.scriptScript },
    symbol: { ...slots.symbol },
    subSymbol: { ...slots.subSymbol },
  };
}

export function normalizeDefineSizesPrefs(
  raw: Partial<DefineSizesPrefs> | null | undefined,
): DefineSizesPrefs {
  const base = raw?.slots ?? FACTORY_DEFINE_SIZES;
  return {
    version: 1,
    slots: {
      full: clampSlot(base.full ?? FACTORY_DEFINE_SIZES.full, "full"),
      script: clampSlot(base.script ?? FACTORY_DEFINE_SIZES.script, "script"),
      scriptScript: clampSlot(
        base.scriptScript ?? FACTORY_DEFINE_SIZES.scriptScript,
        "scriptScript",
      ),
      symbol: clampSlot(base.symbol ?? FACTORY_DEFINE_SIZES.symbol, "symbol"),
      subSymbol: clampSlot(
        base.subSymbol ?? FACTORY_DEFINE_SIZES.subSymbol,
        "subSymbol",
      ),
    },
  };
}

/** Resolve a slot to absolute pt (percent slots relative to Full). */
export function resolveSizeSlotPt(
  prefs: DefineSizesPrefs,
  id: SizeSlotId,
): number {
  const full = prefs.slots.full.value;
  const slot = prefs.slots[id];
  if (id === "full" || slot.unit === "pt") return slot.value;
  return Math.round(((full * slot.value) / 100) * 100) / 100;
}

export function sizeSlotsToPresetFields(prefs: DefineSizesPrefs): {
  fullPt: number;
  subSupPt: number;
  subSubSupPt: number;
  symbolPt: number;
  subSymbolPt: number;
} {
  return {
    fullPt: resolveSizeSlotPt(prefs, "full"),
    subSupPt: resolveSizeSlotPt(prefs, "script"),
    subSubSupPt: resolveSizeSlotPt(prefs, "scriptScript"),
    symbolPt: resolveSizeSlotPt(prefs, "symbol"),
    subSymbolPt: resolveSizeSlotPt(prefs, "subSymbol"),
  };
}

export function syncDefineSizesToRoot(prefs: DefineSizesPrefs): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const pts = sizeSlotsToPresetFields(prefs);
  root.style.setProperty("--mt-full-pt", String(pts.fullPt));
  root.style.setProperty("--mt-full-size", `${pts.fullPt}pt`);
  root.style.setProperty("--mt-script-size", `${pts.subSupPt}pt`);
  root.style.setProperty("--mt-scriptscript-size", `${pts.subSubSupPt}pt`);
  root.style.setProperty("--mt-symbol-size", `${pts.symbolPt}pt`);
  root.style.setProperty("--mt-subsymbol-size", `${pts.subSymbolPt}pt`);
}

/** Inline CSS vars for off-screen PNG/SVG export hosts (html-to-image). */
export function defineSizesInlineVars(prefs: DefineSizesPrefs): string {
  const pts = sizeSlotsToPresetFields(prefs);
  return [
    `--mt-full-pt:${pts.fullPt}`,
    `--mt-full-size:${pts.fullPt}pt`,
    `--mt-script-size:${pts.subSupPt}pt`,
    `--mt-scriptscript-size:${pts.subSubSupPt}pt`,
    `--mt-symbol-size:${pts.symbolPt}pt`,
    `--mt-subsymbol-size:${pts.subSymbolPt}pt`,
  ].join(";");
}

export function readDefineSizesPrefs(): DefineSizesPrefs {
  if (typeof localStorage === "undefined") {
    return normalizeDefineSizesPrefs(null);
  }
  try {
    const raw = localStorage.getItem(DEFINE_SIZES_STORAGE_KEY);
    if (!raw) return normalizeDefineSizesPrefs(null);
    return normalizeDefineSizesPrefs(JSON.parse(raw) as DefineSizesPrefs);
  } catch {
    return normalizeDefineSizesPrefs(null);
  }
}

export function writeDefineSizesPrefs(prefs: DefineSizesPrefs): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      DEFINE_SIZES_STORAGE_KEY,
      JSON.stringify(normalizeDefineSizesPrefs(prefs)),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearDefineSizesPrefs(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(DEFINE_SIZES_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
