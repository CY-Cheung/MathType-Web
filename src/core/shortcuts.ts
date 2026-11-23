/**
 * MathType 6.9b shortcuts.
 * `#@` is the current selection, or an empty slot when nothing is selected.
 * `#?` is always an empty slot.
 */

export type ChordName = "greek" | "symbol" | "template";

export const CHORD_STATUS: Record<ChordName, string> = {
  greek: "Waiting for Greek letter (Ctrl+G)...",
  symbol: "Waiting for symbol (Ctrl+K)...",
  template: "Waiting for template (Alt+T)...",
};

const DIRECT: Record<string, string> = {
  f: "\\frac{#@}{#?}",
  r: "\\sqrt{#@}",
  h: "^{#@}",
  l: "_{#@}",
  j: "_{#@}^{#?}",
  "9": "\\left(#@\\right)",
  "[": "\\left[#@\\right]",
  "{": "\\left\\{#@\\right\\}",
  i: "\\int_{#?}^{#?}#@",
};

const GREEK: Record<string, string> = {
  a: "\\alpha",
  b: "\\beta",
  g: "\\gamma",
  d: "\\delta",
  q: "\\theta",
  l: "\\lambda",
  p: "\\pi",
  s: "\\sigma",
  f: "\\phi",
  w: "\\omega",
  A: "\\Alpha",
  B: "\\Beta",
  G: "\\Gamma",
  D: "\\Delta",
  Q: "\\Theta",
  L: "\\Lambda",
  P: "\\Pi",
  S: "\\Sigma",
  F: "\\Phi",
  W: "\\Omega",
};

const SYMBOLS: Record<string, string> = {
  "<": "\\le",
  ">": "\\ge",
  "=": "\\neq",
  "~": "\\approx",
  "+": "\\pm",
  "-": "\\mp",
  t: "\\times",
  ".": "\\cdot",
  i: "\\infty",
  d: "\\partial",
};

const TEMPLATES: Record<string, string> = {
  n: "\\sqrt[#?]{#@}",
  s: "\\sum_{#?}^{#?}#@",
  p: "\\prod_{#?}^{#?}#@",
  "|": "\\left|#@\\right|",
};

/**
 * MathLive 0.111 accepts `#?` and `#@` in `executeCommand(["insert", ...])`
 * and turns both into placeholders. `#@` receives the selection when there is one.
 */
export function toMathliveTemplate(template: string): string {
  return template;
}

function letter(event: KeyboardEvent): string | null {
  if (/^[a-zA-Z]$/.test(event.key)) return event.key;
  const code = /^Key([A-Z])$/.exec(event.code);
  if (!code) return null;
  return event.shiftKey ? code[1] : code[1].toLowerCase();
}

function ctrlPlain(event: KeyboardEvent): boolean {
  return event.ctrlKey && !event.altKey && !event.metaKey;
}

export function directTemplate(event: KeyboardEvent): string | null {
  if (!ctrlPlain(event)) return null;
  if (event.code === "BracketLeft" && event.shiftKey) return DIRECT["{"];
  if (event.code === "BracketLeft" && !event.shiftKey) return DIRECT["["];
  if ((event.code === "Digit9" || event.code === "Numpad9") && !event.shiftKey) {
    return DIRECT["9"];
  }
  const key = letter(event);
  if (!key || event.shiftKey) return null;
  return DIRECT[key] ?? null;
}

export function chordStart(event: KeyboardEvent): ChordName | null {
  if (event.altKey && !event.ctrlKey && !event.metaKey && letter(event)?.toLowerCase() === "t") {
    return "template";
  }
  if (!ctrlPlain(event) || event.shiftKey) return null;
  const key = letter(event)?.toLowerCase();
  if (key === "g") return "greek";
  if (key === "k") return "symbol";
  return null;
}

export function chordTemplate(chord: ChordName, event: KeyboardEvent): string | null {
  if (chord === "greek") {
    const key = letter(event);
    return key ? (GREEK[key] ?? null) : null;
  }
  if (chord === "symbol") {
    const key = event.key.length === 1 ? event.key : "";
    if (SYMBOLS[key]) return SYMBOLS[key];
    const lower = letter(event)?.toLowerCase();
    return lower ? (SYMBOLS[lower] ?? null) : null;
  }
  if (event.key === "|") return TEMPLATES["|"];
  const key = letter(event)?.toLowerCase();
  return key ? (TEMPLATES[key] ?? null) : null;
}

export function isModifierOnly(event: KeyboardEvent): boolean {
  return event.key === "Shift" || event.key === "Control" || event.key === "Alt" || event.key === "Meta";
}

/**
 * Custom matrix dialog.
 * Ctrl+M is free: direct shortcuts use F, R, H, L, J, I, 9, and brackets.
 * Ctrl+D is MathLive's macOS delete-forward binding, so it is not used.
 */
export const MATRIX_DIALOG_SHORTCUT = "Ctrl+M";

export function isMatrixDialogShortcut(event: KeyboardEvent): boolean {
  if (event.repeat || event.altKey || event.metaKey || event.shiftKey || !event.ctrlKey) return false;
  return event.code === "KeyM";
}

/** Default clipboard export (MathML). Leaves Ctrl+C for MathLive's own copy. */
export const EXPORT_SHORTCUT = "Ctrl+Shift+C";

export function isExportShortcut(event: KeyboardEvent): boolean {
  if (event.repeat || event.altKey || event.metaKey || !event.ctrlKey || !event.shiftKey) return false;
  return event.code === "KeyC";
}

/** MathType: switch Active Style → Text. */
export const TEXT_STYLE_SHORTCUT = "Ctrl+Shift+E";

export function isTextStyleShortcut(event: KeyboardEvent): boolean {
  if (event.repeat || event.altKey || event.metaKey || !event.ctrlKey || !event.shiftKey) return false;
  return event.code === "KeyE";
}

/**
 * MathType: switch Active Style → Math.
 * Primary: Ctrl+Shift+= ; backup: Ctrl+Shift+M (Ctrl+M alone opens Matrix).
 */
export const MATH_STYLE_SHORTCUT = "Ctrl+Shift+=";
export const MATH_STYLE_SHORTCUT_ALT = "Ctrl+Shift+M";

export function isMathStyleShortcut(event: KeyboardEvent): boolean {
  if (event.repeat || event.altKey || event.metaKey || !event.ctrlKey || !event.shiftKey) return false;
  return event.code === "Equal" || event.code === "NumpadEqual" || event.code === "KeyM";
}

/**
 * Workspace view zoom presets (display only).
 * Ctrl+1 / Ctrl+2 / Ctrl+4 — free of formula chords (those use letters / 9 / brackets).
 */
export function workspaceZoomShortcutPercent(event: KeyboardEvent): number | null {
  if (event.repeat || event.altKey || event.metaKey || event.shiftKey || !event.ctrlKey) {
    return null;
  }
  if (event.code === "Digit1" || event.code === "Numpad1") return 100;
  if (event.code === "Digit2" || event.code === "Numpad2") return 200;
  if (event.code === "Digit3" || event.code === "Numpad3") return 300;
  if (event.code === "Digit4" || event.code === "Numpad4") return 400;
  return null;
}
