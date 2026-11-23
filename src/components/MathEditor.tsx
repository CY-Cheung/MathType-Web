import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { MathfieldElement } from "mathlive";
import { focusAt, readSelection, type EditorSelection } from "../core/editorSelection";
import { toMathliveTemplate } from "../core/shortcuts";
import { useMathShortcuts } from "../core/useMathShortcuts";
import {
  defaultStylePreset,
  type StylePreset,
} from "../types/preset";

const SHADOW_STYLE_ID = "mt-10pt-shadow";

/** Shadow CSS: Times for letters; stretchy glyphs stay on MathLive fonts. */
export const MATHFIELD_SHADOW_CSS = `
:host {
  --_text-font-family: var(--mt-font-family, "Times New Roman", "TeX Gyre Termes", "Liberation Serif", Times, serif);
  font-family: var(--mt-font-family, "Times New Roman", "TeX Gyre Termes", "Liberation Serif", Times, serif);
}
.ML__cmr,
.ML__mathbf,
.ML__text,
.ML__content-placeholder {
  font-family: var(--mt-font-family, "Times New Roman", "TeX Gyre Termes", "Liberation Serif", Times, serif) !important;
}
/* MathLive 0.111 draws \\placeholder{} as U+25A2 on span.ML__cmr. */
.mt-empty-slot {
  display: inline-block;
  box-sizing: border-box;
  width: 0.48em;
  height: 0.68em;
  margin: 0 0.22em;
  vertical-align: -0.05em;
  line-height: 1;
  overflow: hidden;
  color: transparent;
  -webkit-text-fill-color: transparent;
  border: 1px dashed #008000;
}
.ML__mathit,
.ML__mathbfit,
.lcGreek.ML__mathbf {
  font-family: var(--mt-font-family, "Times New Roman", "TeX Gyre Termes", "Liberation Serif", Times, serif) !important;
  font-style: italic;
}
.ML__virtual-keyboard-toggle,
.ML__menu-toggle {
  display: none !important;
}
`;

function fontStack(fontFamily: string): string {
  return `"${fontFamily}", "TeX Gyre Termes", "Liberation Serif", Times, serif`;
}

const EMPTY_SLOT = "\u25A2";

function markEmptySlots(root: ShadowRoot): void {
  for (const node of root.querySelectorAll("span.ML__cmr")) {
    if (!(node instanceof HTMLElement)) continue;
    node.classList.toggle("mt-empty-slot", node.textContent === EMPTY_SLOT);
  }
}

function applyShadowStyle(field: MathfieldElement): void {
  const root = field.shadowRoot;
  if (!root || root.getElementById(SHADOW_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = SHADOW_STYLE_ID;
  style.textContent = MATHFIELD_SHADOW_CSS;
  root.appendChild(style);
}

type MathEditorProps = {
  preset?: StylePreset;
  onChordStatus?: (status: string) => void;
  onMatrixDialog?: () => void;
};

export type { EditorSelection };

export type MathEditorHandle = {
  insert: (latex: string, at?: EditorSelection | null) => void;
  load: (latex: string) => void;
  capture: () => string;
  captureLatex: () => string;
  captureMathMl: () => string;
  captureSelection: () => EditorSelection;
  restoreSelection: (selection: EditorSelection | null) => void;
};

export const MathEditor = forwardRef<MathEditorHandle, MathEditorProps>(
  function MathEditor({ preset = defaultStylePreset, onChordStatus, onMatrixDialog }, ref) {
  const fieldRef = useRef<MathfieldElement>(null);
  const { chordStatus } = useMathShortcuts(fieldRef, onMatrixDialog);
  const family = fontStack(preset.fontFamily);
  const viewSize = `calc(${preset.fullPt}pt * ${preset.zoomPercent} / 100)`;

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    let cancelled = false;
    let observer: MutationObserver | null = null;

    const configure = () => {
      if (cancelled || fieldRef.current !== field) return;
      field.mathVirtualKeyboardPolicy = "manual";
      field.menuItems = [];
      field.letterShapeStyle = "tex";
      field.defaultMode = "math";
      field.placeholder = String.raw`\text{Type a formula}`;
      const root = field.shadowRoot;
      if (!root) {
        requestAnimationFrame(configure);
        return;
      }
      applyShadowStyle(field);
      markEmptySlots(root);
      observer?.disconnect();
      observer = new MutationObserver(() => markEmptySlots(root));
      observer.observe(root, { childList: true, subtree: true, characterData: true });
    };

    configure();
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    onChordStatus?.(chordStatus);
  }, [chordStatus, onChordStatus]);

  useImperativeHandle(ref, () => ({
    insert(latex: string, at?: EditorSelection | null) {
      const field = fieldRef.current;
      if (!field) return;
      focusAt(field, at);
      field.executeCommand(["insert", toMathliveTemplate(latex)]);
      field.focus();
    },
    load(latex: string) {
      const field = fieldRef.current;
      if (!field) return;
      field.setValue(toMathliveTemplate(latex));
      field.focus();
    },
    capture() {
      const field = fieldRef.current;
      if (!field) return "";
      if (!field.selectionIsCollapsed) return field.getValue(field.selection);
      return field.value;
    },
    captureLatex() {
      return fieldRef.current?.getValue("latex") ?? "";
    },
    captureMathMl() {
      return fieldRef.current?.getValue("math-ml") ?? "";
    },
    captureSelection() {
      const field = fieldRef.current;
      return field ? readSelection(field) : { ranges: [[0, 0]] };
    },
    restoreSelection(selection: EditorSelection | null) {
      const field = fieldRef.current;
      if (field) focusAt(field, selection);
    },
  }));

  return (
    <math-field
      ref={fieldRef}
      className="mt-math-field"
      aria-label="Math editor"
      math-virtual-keyboard-policy="manual"
      style={{
        fontFamily: family,
        fontSize: viewSize,
        ["--mt-font-family" as string]: family,
        ["--mt-full-size" as string]: `${preset.fullPt}pt`,
        ["--mt-script-size" as string]: `${preset.subSupPt}pt`,
        ["--mt-scriptscript-size" as string]: `${preset.subSubSupPt}pt`,
        ["--mt-symbol-size" as string]: `${preset.symbolPt}pt`,
        ["--mt-subsymbol-size" as string]: `${preset.subSymbolPt}pt`,
        ["--mt-user1-size" as string]: `${preset.user1Percent}%`,
        ["--mt-user2-size" as string]: `${preset.user2Percent}%`,
        ["--mt-selection-bg" as string]: "#80ffff",
        ["--selection-background-color" as string]: "#80ffff",
        ["--mt-zoom" as string]: String(preset.zoomPercent / 100),
        ["--mt-view-size" as string]: viewSize,
        ["--text-font-family" as string]: family,
      }}
    />
  );
  },
);
