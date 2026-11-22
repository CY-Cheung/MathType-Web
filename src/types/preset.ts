/**
 * MathType 6.9b 10pt size table from SPEC.md.
 * Point slots are absolute. User 1 and User 2 are percentages of Full.
 */

export type MathStyleName =
  | "Math"
  | "Text"
  | "Function"
  | "Variable"
  | "Greek"
  | "Vector"
  | "User1"
  | "User2";

export interface StylePreset {
  id: string;
  name: string;
  /** Active MathType style. Step 1 is Math. */
  style: MathStyleName;
  /** Active size slot. Step 1 is Full. */
  size: "full";
  /** Primary face for the Math style. */
  fontFamily: string;
  /** View magnification. 200 means the 10pt equation is shown at 20pt. */
  zoomPercent: number;
  fullPt: number;
  subSupPt: number;
  subSubSupPt: number;
  symbolPt: number;
  subSymbolPt: number;
  /** Percentage of full size. */
  user1Percent: number;
  /** Percentage of full size. */
  user2Percent: number;
}

/** Locked MathType 6.9b defaults. Full is 10pt; the other slots are not scaled. */
export const MATHTYPE_69B_10PT: StylePreset = {
  id: "mathtype-6.9b-10pt",
  name: "MathType 6.9b 10pt",
  style: "Math",
  size: "full",
  fontFamily: "Times New Roman",
  zoomPercent: 200,
  fullPt: 10,
  subSupPt: 7,
  subSubSupPt: 5,
  symbolPt: 18,
  subSymbolPt: 12,
  user1Percent: 75,
  user2Percent: 150,
};

export const defaultStylePreset: StylePreset = MATHTYPE_69B_10PT;

export function statusBarLabel(preset: StylePreset = defaultStylePreset): string {
  return `Style: ${preset.style} | Size: Full (${preset.fullPt}pt) | Zoom: ${preset.zoomPercent}%`;
}

export const STATUS_BAR_LABEL = statusBarLabel(MATHTYPE_69B_10PT);
