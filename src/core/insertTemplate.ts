/**
 * Adapt MathLive insert templates for collapsed vs selected caret.
 *
 * MathLive `#@` placeholders use `captureSelection` — with an empty selection
 * they can pull the preceding atom/group into the slot (e.g. `^{#@}` turns
 * `-(x-h)|` into `-^{(x-h)}`). When nothing is selected, script slots must use
 * `#?` so we only open an empty superscript/subscript after the caret.
 */

/** Templates that put `#@` inside a script — rewrite when selection is empty. */
const SCRIPT_COLLAPSED_MAP: ReadonlyArray<readonly [string, string]> = [
  ["^{#@}", "^{#?}"],
  ["_{#@}", "_{#?}"],
  ["_{#@}^{#?}", "_{#?}^{#?}"],
];

/**
 * When `hasSelection` is false, rewrite superscript/subscript `#@` → `#?`.
 * Other templates (`\\frac{#@}{#?}`, fences, accents) keep `#@` (empty slot /
 * wrap-previous semantics are desirable there).
 */
export function adaptInsertTemplate(latex: string, hasSelection: boolean): string {
  if (hasSelection) return latex;
  for (const [from, to] of SCRIPT_COLLAPSED_MAP) {
    if (latex === from) return to;
  }
  return latex;
}
