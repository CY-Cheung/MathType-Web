import type { InlineShortcutDefinitions } from "mathlive";

/**
 * Letter-run MathLive inlineShortcuts that become operator atoms
 * (`tan` → `\tan`). On Android + Samsung Keyboard these fire mid-IME and
 * leave duplicate letter buffers (`\tan tanx`). Desktop keeps them.
 *
 * Longest names listed for documentation; deletion is by exact key match.
 */
export const LETTER_FUNCTION_SHORTCUT_KEYS: readonly string[] = [
  "arcsin",
  "arccos",
  "arctan",
  "arctanh",
  "arsinh",
  "arcosh",
  "artanh",
  "arccosh",
  "arcsec",
  "arccsc",
  "arcsech",
  "arccsch",
  "arctg",
  "liminf",
  "limsup",
  "sinh",
  "cosh",
  "tanh",
  "sech",
  "coth",
  "cosec",
  "cotg",
  "sin",
  "cos",
  "tan",
  "sec",
  "csc",
  "cot",
  "ctg",
  "cth",
  "log",
  "ln",
  "lim",
  "exp",
  "max",
  "min",
  "det",
  "gcd",
  "sup",
  "inf",
  "ker",
  "deg",
  "dim",
  "hom",
  "arg",
  "Pr",
  "ch",
  "sh",
  "tg",
  "th",
] as const;

const KEY_SET = new Set<string>(LETTER_FUNCTION_SHORTCUT_KEYS);

export function isAndroidUserAgent(
  ua: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
): boolean {
  return /Android/i.test(ua);
}

/** True when this shortcut key is a letter-function auto-convert. */
export function isLetterFunctionShortcutKey(key: string): boolean {
  return KEY_SET.has(key);
}

/**
 * Copy of MathLive `inlineShortcuts` with letter-function entries removed.
 * Non-function shortcuts (Greek, primes, `sqrt`, `sum`, …) are preserved.
 */
export function withoutLetterFunctionShortcuts(
  shortcuts: InlineShortcutDefinitions,
): InlineShortcutDefinitions {
  const next: InlineShortcutDefinitions = { ...shortcuts };
  for (const key of LETTER_FUNCTION_SHORTCUT_KEYS) {
    delete next[key];
  }
  return next;
}

/**
 * Android: strip letter-function shortcuts.
 * Desktop / other: return the same object reference (no clone).
 */
export function inlineShortcutsForPlatform(
  shortcuts: InlineShortcutDefinitions,
  ua?: string,
): InlineShortcutDefinitions {
  if (!isAndroidUserAgent(ua)) return shortcuts;
  return withoutLetterFunctionShortcuts(shortcuts);
}
