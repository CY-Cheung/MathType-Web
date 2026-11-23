import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { MathfieldElement } from "mathlive";
import { focusAt, readSelection, type EditorSelection } from "../core/editorSelection";
import { toMathliveTemplate } from "../core/shortcuts";
import { useMathShortcuts } from "../core/useMathShortcuts";
import { buildDefineStylesMappedCss } from "../types/defineStyles";
import {
  defaultStylePreset,
  type StylePreset,
} from "../types/preset";
import { MT_FONT_STACK } from "../styles/fontStack";

const SHADOW_STYLE_ID = "mt-10pt-shadow";

/**
 * Shadow CSS: Define Styles → MathLive classes.
 * Stretchy KaTeX / MathLive operator fonts are left alone (Symbol/Extra Math
 * letter faces still map where MathLive uses text spans).
 */
export const MATHFIELD_SHADOW_CSS = `
:host {
  --_text-font-family: var(--mt-ds-text-font, var(--mt-text-font, ${MT_FONT_STACK}));
  font-family: var(--mt-ds-variable-font, var(--mt-math-font, ${MT_FONT_STACK}));
}
${buildDefineStylesMappedCss("")}
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
/* Keep the MathLive chrome menu off (menuItems = []); leave the
   virtual-keyboard toggle visible so mobile users can dismiss / reopen. */
.ML__menu-toggle {
  display: none !important;
}
`;

const EMPTY_SLOT = "\u25A2";

function markEmptySlots(root: ShadowRoot): void {
  for (const node of root.querySelectorAll("span.ML__cmr")) {
    if (!(node instanceof HTMLElement)) continue;
    node.classList.toggle("mt-empty-slot", node.textContent === EMPTY_SLOT);
  }
}

function applyShadowStyle(field: MathfieldElement): void {
  const root = field.shadowRoot;
  if (!root) return;
  let style = root.getElementById(SHADOW_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = SHADOW_STYLE_ID;
    root.appendChild(style);
  }
  style.textContent = MATHFIELD_SHADOW_CSS;
}

type MathEditorProps = {
  preset?: StylePreset;
  /** Bumps when Define Styles commit so shadow CSS / CSS vars refresh. */
  stylesEpoch?: number;
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
  function MathEditor(
    {
      preset = defaultStylePreset,
      stylesEpoch = 0,
      onChordStatus,
      onMatrixDialog,
    },
    ref,
  ) {
  const fieldRef = useRef<MathfieldElement>(null);
  const { chordStatus } = useMathShortcuts(fieldRef, onMatrixDialog);
  const viewSize = `calc(${preset.fullPt}pt * ${preset.zoomPercent} / 100)`;

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    let cancelled = false;
    let observer: MutationObserver | null = null;

    const configure = () => {
      if (cancelled || fieldRef.current !== field) return;
      // "auto": MathLive shows its virtual keyboard on touch focusin.
      // "manual" + CSS display:none was blocking mobile keyboards entirely.
      field.mathVirtualKeyboardPolicy = "auto";
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

    /** Ensure focus + VK show stay inside the user gesture (some WebViews). */
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      if (cancelled || fieldRef.current !== field) return;
      if (!field.isConnected) return;
      field.focus();
      try {
        window.mathVirtualKeyboard?.show({ animate: true });
      } catch {
        /* MathLive may not have attached yet; policy=auto still covers focusin. */
      }
    };

    configure();
    field.addEventListener("pointerup", onPointerUp);
    return () => {
      cancelled = true;
      observer?.disconnect();
      field.removeEventListener("pointerup", onPointerUp);
    };
  }, [stylesEpoch]);

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
      math-virtual-keyboard-policy="auto"
      style={{
        fontFamily: `var(--mt-ds-variable-font, ${MT_FONT_STACK})`,
        fontSize: viewSize,
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
        ["--text-font-family" as string]: "var(--mt-ds-text-font, var(--mt-text-font))",
      }}
    />
  );
  },
);
