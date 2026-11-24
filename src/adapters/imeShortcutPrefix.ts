/**
 * MathLive inlineShortcuts that convert letter runs into operator atoms
 * (`tan` → `\tan`). Samsung Keyboard often keeps the same letters in the
 * composition buffer, so a later `compositionend` may submit `"tanx"` while
 * the caret already sits after `\tan`.
 */

/** Longest-first so `arcsin` wins over `sin`, `tanh` over `tan`, etc. */
export const FUNCTION_SHORTCUT_NAMES: readonly string[] = [
  "arcsin",
  "arccos",
  "arctan",
  "arctanh",
  "arsinh",
  "arcosh",
  "artanh",
  "arcsec",
  "arccsc",
  "arccosh",
  "arcsech",
  "arccsch",
  "liminf",
  "limsup",
  "sinh",
  "cosh",
  "tanh",
  "sech",
  "coth",
  "cosec",
  "sin",
  "cos",
  "tan",
  "sec",
  "csc",
  "cot",
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
].sort((a, b) => b.length - a.length || a.localeCompare(b));

const NAME_SET = new Set(FUNCTION_SHORTCUT_NAMES);

export function isFunctionShortcutName(name: string): boolean {
  return NAME_SET.has(name);
}

/**
 * If `composed` is exactly `functionName`, return `""` (drop duplicate).
 * If `composed` is `functionName` + suffix (e.g. `tan` + `x`), return suffix.
 * Otherwise return `null` (no rewrite).
 */
export function stripFunctionShortcutPrefix(
  composed: string,
  functionName: string | null | undefined,
): string | null {
  if (!composed || !functionName) return null;
  if (!isFunctionShortcutName(functionName)) return null;
  if (composed === functionName) return "";
  if (composed.startsWith(functionName)) {
    const rest = composed.slice(functionName.length);
    // Only strip when the remainder is a natural continuation (no extra glue).
    if (rest.length > 0) return rest;
  }
  return null;
}

/**
 * Longest known function name that is a prefix of `composed`, or null.
 * Used when the caret context is ambiguous but the buffer clearly starts
 * with a shortcut token (e.g. `"tanx"` → `"tan"`).
 */
export function leadingFunctionShortcutPrefix(composed: string): string | null {
  if (!composed) return null;
  for (const name of FUNCTION_SHORTCUT_NAMES) {
    if (composed === name || composed.startsWith(name)) return name;
  }
  return null;
}
