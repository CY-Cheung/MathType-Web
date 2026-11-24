import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { MathfieldElement } from "mathlive";
import { attachAndroidBackspaceBridge } from "../adapters/androidBackspaceBridge";
import { inlineShortcutsForPlatform } from "../adapters/androidFnShortcuts";
import { commitPendingComposition } from "../adapters/commitComposition";
import { attachImeCompositionGuard } from "../adapters/imeCompositionGuard";
import {
  applyActiveStyleToField,
  bindInsertStyleHook,
  insertStyledLetter,
  lockModeToActiveStyle,
} from "../core/activeStyleApply";
import { focusAt, readSelection, type EditorSelection } from "../core/editorSelection";
import {
  insertMathLineBreak,
  isPlainEnterKey,
  shouldIgnoreEnterForIme,
} from "../core/enterLineBreak";
import { insertAdaptedLatex } from "../core/insertAdapted";
import {
  isMathStyleShortcut,
  isTextStyleShortcut,
  toMathliveTemplate,
} from "../core/shortcuts";
import { useMathShortcuts } from "../core/useMathShortcuts";
import {
  DEFAULT_ACTIVE_STYLE,
  parseModeForActiveStyle,
  type ActiveStyleId,
} from "../types/activeStyle";
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
  /* Kill MathLive focused-text gray wash (Text style letters / scripts). */
  --highlight-text: transparent;
  --_text-highlight-background-color: transparent;
  --contains-highlight-background-color: transparent;
  --_contains-highlight-background-color: transparent;
  /* Clear brown IME wash only — keep composition glyphs fully opaque. */
  --composition-background-color: transparent;
  --_composition-background-color: transparent;
  --composition-underline-color: transparent;
  --_composition-underline-color: transparent;
  --composition-text-color: #000;
  --_composition-text-color: #000;
}
.ML__composition {
  /* Background only — never hide the composing letter (e.g. mid-IME d). */
  background-color: transparent !important;
  background: transparent !important;
  color: #000 !important;
  -webkit-text-fill-color: #000 !important;
  opacity: 1 !important;
  visibility: visible !important;
  text-decoration: none !important;
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
/* Toolbar already covers insertion; hide MathLive chrome toggles. */
.ML__virtual-keyboard-toggle,
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

/** MathLive's contenteditable sink that owns keyboard focus (Shadow DOM). */
function findKeyboardSink(field: MathfieldElement): HTMLElement | null {
  const root = field.shadowRoot;
  if (!root) return null;
  const sink = root.querySelector(".ML__keyboard-sink");
  return sink instanceof HTMLElement ? sink : null;
}

/**
 * Capture-phase Enter on the sink (+ host fallback). MathLive handles keydown
 * on the sink; capture + stopImmediatePropagation runs before its handler.
 */
function bindEnterCapture(
  field: MathfieldElement,
): () => void {
  const targets = new Set<EventTarget>();
  const sink = findKeyboardSink(field);
  if (sink) targets.add(sink);
  targets.add(field);
  const root = field.shadowRoot;
  if (root) targets.add(root);

  const onKeyDown = (event: Event) => {
    if (!(event instanceof KeyboardEvent)) return;
    if (!isPlainEnterKey(event)) return;
    if (shouldIgnoreEnterForIme(event)) return;
    // Latex mode: leave Enter to MathLive complete keybinding.
    if (field.mode === "latex") return;

    const path =
      typeof event.composedPath === "function" ? event.composedPath() : [];
    if (!path.includes(field) && event.target !== field && event.target !== sink) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    commitPendingComposition(field);
    insertMathLineBreak(field);
  };

  for (const target of targets) {
    target.addEventListener("keydown", onKeyDown, true);
  }
  return () => {
    for (const target of targets) {
      target.removeEventListener("keydown", onKeyDown, true);
    }
  };
}

/**
 * Unlock the OS / Android native keyboard.
 * MathLive ships the sink as `inputmode=none` so only its virtual keyboard
 * appears — override to `text` and keep autocorrect off for formula entry.
 */
function setAttrIfNeeded(el: HTMLElement, name: string, value: string): void {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

export function unlockNativeKeyboardSink(sink: HTMLElement): void {
  // Only write when values differ — avoids MutationObserver feedback loops.
  setAttrIfNeeded(sink, "inputmode", "text");
  setAttrIfNeeded(sink, "autocorrect", "off");
  setAttrIfNeeded(sink, "autocapitalize", "off");
  setAttrIfNeeded(sink, "autocomplete", "off");
  setAttrIfNeeded(sink, "spellcheck", "false");
}

function unlockFieldNativeKeyboard(field: MathfieldElement): HTMLElement | null {
  const sink = findKeyboardSink(field);
  if (sink) unlockNativeKeyboardSink(sink);
  return sink;
}

/** Host `data-empty` drives the CSS "Type a formula" overlay (spaces preserved). */
function syncEmptyPlaceholder(field: MathfieldElement): void {
  const empty = !(field.getValue("latex") ?? "").trim();
  field.toggleAttribute("data-empty", empty);
}

type MathEditorProps = {
  preset?: StylePreset;
  /** Bumps when Define Styles commit so shadow CSS / CSS vars refresh. */
  stylesEpoch?: number;
  /** Active Style Switcher selection (Math / Text / Function / …). */
  activeStyle?: ActiveStyleId;
  onActiveStyleChange?: (id: ActiveStyleId) => void;
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
  applyActiveStyle: (id: ActiveStyleId) => void;
  /** MathLive command bridge for Edit menu (undo / cut / clear / …). */
  executeCommand: (command: string | [string, ...unknown[]]) => boolean;
};

export const MathEditor = forwardRef<MathEditorHandle, MathEditorProps>(
  function MathEditor(
    {
      preset = defaultStylePreset,
      stylesEpoch = 0,
      activeStyle = DEFAULT_ACTIVE_STYLE,
      onActiveStyleChange,
      onChordStatus,
      onMatrixDialog,
    },
    ref,
  ) {
  const fieldRef = useRef<MathfieldElement>(null);
  const activeStyleRef = useRef(activeStyle);
  activeStyleRef.current = activeStyle;
  /** Blocks mode-change snap-back while Text briefly enters math for scripts. */
  const suppressModeLockRef = useRef(false);
  const { chordStatus } = useMathShortcuts(fieldRef, onMatrixDialog, {
    getActiveStyle: () => activeStyleRef.current,
    suppressModeLock: suppressModeLockRef,
  });
  const viewSize = `calc(${preset.fullPt}pt * ${preset.zoomPercent} / 100)`;

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    let cancelled = false;
    let slotObserver: MutationObserver | null = null;
    let inputModeObserver: MutationObserver | null = null;
    let detachBackspaceBridge: (() => void) | null = null;
    let detachImeGuard: (() => void) | null = null;
    let detachEnterCapture: (() => void) | null = null;
    let enterSinkBound: HTMLElement | null = null;

    const attachEnterCapture = (mf: MathfieldElement) => {
      const sink = findKeyboardSink(mf);
      // Rebind only when the sink node is (re)created — not on every attr tweak.
      if (sink && sink === enterSinkBound && detachEnterCapture) return;
      detachEnterCapture?.();
      enterSinkBound = sink;
      detachEnterCapture = bindEnterCapture(mf);
    };

    const configure = () => {
      if (cancelled || fieldRef.current !== field) return;
      // Keep MathLive VK off — mobile uses the OS native keyboard instead.
      field.mathVirtualKeyboardPolicy = "manual";
      try {
        window.mathVirtualKeyboard?.hide();
      } catch {
        /* optional */
      }
      field.menuItems = [];
      field.letterShapeStyle = "tex";
      field.defaultMode = "math";
      // Android + Samsung IME: drop letter-function inlineShortcuts (`tan`→`\tan`)
      // so mid-composition conversion cannot leave `\tan tanx`. Desktop unchanged.
      try {
        field.inlineShortcuts = inlineShortcutsForPlatform({
          ...field.inlineShortcuts,
        });
      } catch {
        /* inlineShortcuts may be frozen on some builds */
      }
      // Prevent MathLive prose auto-flips that leave Active Style stuck on Text.
      field.smartMode = false;
      // Empty-canvas hint is a CSS overlay (`data-empty`) — MathLive's latex
      // placeholder ate spaces ("Typeaformula") and `\text{…}` polluted mode.
      field.placeholder = "";
      // Active Style owns insert style (do not inherit upright from digits).
      bindInsertStyleHook(field, () => activeStyleRef.current);
      // Drop built-in Quote / Alt+T math↔text toggles — Active Style owns mode.
      // Bind math-mode Enter/Return → addRowAfter so MathLive skips its bare
      // Enter "commit"/change-only path (which does nothing on a single line).
      try {
        const bindings = field.keybindings ?? [];
        const filtered = bindings.filter((row) => {
          const key = String(row.key ?? "");
          // Remove any prior Enter bindings in math (we re-add below).
          if (
            (key === "[Enter]" || key === "[Return]" || key === "enter") &&
            (!row.ifMode || row.ifMode === "math")
          ) {
            return false;
          }
          const cmd = Array.isArray(row.command) ? row.command[0] : row.command;
          if (cmd !== "switchMode") return true;
          const target = Array.isArray(row.command) ? row.command[1] : undefined;
          return target === "latex";
        });
        field.keybindings = [
          ...filtered,
          { key: "[Enter]", ifMode: "math", command: "addRowAfter" },
          { key: "[Return]", ifMode: "math", command: "addRowAfter" },
        ];
      } catch {
        /* keybindings may be frozen on some builds */
      }
      const root = field.shadowRoot;
      if (!root) {
        requestAnimationFrame(configure);
        return;
      }
      applyShadowStyle(field);
      unlockFieldNativeKeyboard(field);
      markEmptySlots(root);
      syncEmptyPlaceholder(field);
      lockModeToActiveStyle(field, activeStyleRef.current);
      attachEnterCapture(field);

      slotObserver?.disconnect();
      slotObserver = new MutationObserver(() => {
        markEmptySlots(root);
        syncEmptyPlaceholder(field);
      });
      slotObserver.observe(root, { childList: true, subtree: true, characterData: true });

      // MathLive may recreate the sink or rewrite inputmode=none — force text back.
      inputModeObserver?.disconnect();
      inputModeObserver = new MutationObserver(() => {
        if (cancelled) return;
        unlockFieldNativeKeyboard(field);
        // Sink recreate → rebind Enter capture on the new node.
        attachEnterCapture(field);
      });
      inputModeObserver.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [
          "inputmode",
          "autocorrect",
          "autocapitalize",
          "autocomplete",
          "spellcheck",
        ],
      });

      // Touch / Android: ZWSP sentinel so OS Backspace still reaches MathLive.
      detachBackspaceBridge?.();
      detachBackspaceBridge = attachAndroidBackspaceBridge(field, {
        onAfterDelete: () => {
          // Select-all / clear must leave Math insertion style, not roman.
          lockModeToActiveStyle(field, activeStyleRef.current);
        },
      });

      // Samsung IME: clear residual sink after shortcuts; dismiss stuck composition.
      detachImeGuard?.();
      detachImeGuard = attachImeCompositionGuard(field);
    };

    /** After the canvas is emptied, re-lock mode + clear inherited upright. */
    const onInput = () => {
      if (cancelled || fieldRef.current !== field) return;
      syncEmptyPlaceholder(field);
      const latex = field.getValue("latex") ?? "";
      if (latex.trim() !== "") return;
      lockModeToActiveStyle(field, activeStyleRef.current);
    };

    /** Re-assert inputmode + focus the sink inside the user gesture (Android). */
    const promoteNativeKeyboard = () => {
      if (cancelled || fieldRef.current !== field || !field.isConnected) return;
      const sink = unlockFieldNativeKeyboard(field);
      field.focus();
      // Focusing the contenteditable sink is what Android Chrome keys off.
      sink?.focus({ preventScroll: true });
    };

    const onFocusIn = () => {
      unlockFieldNativeKeyboard(field);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      promoteNativeKeyboard();
    };

    configure();
    field.addEventListener("focusin", onFocusIn);
    field.addEventListener("pointerup", onPointerUp);
    field.addEventListener("input", onInput);
    return () => {
      cancelled = true;
      slotObserver?.disconnect();
      inputModeObserver?.disconnect();
      detachBackspaceBridge?.();
      detachImeGuard?.();
      detachEnterCapture?.();
      field.removeEventListener("focusin", onFocusIn);
      field.removeEventListener("pointerup", onPointerUp);
      field.removeEventListener("input", onInput);
    };
  }, [stylesEpoch]);

  // Apply Active Style when the switcher / shortcuts change it.
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    bindInsertStyleHook(field, () => activeStyleRef.current);
    applyActiveStyleToField(field, activeStyle);
  }, [activeStyle]);

  // Keep mode on Active Style; handle Style shortcuts + Function letters.
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    let reasserting = false;

    const onModeChange = () => {
      if (reasserting || suppressModeLockRef.current) return;
      const active = activeStyleRef.current;
      const expected = parseModeForActiveStyle(active);
      // Snap back if MathLive / IME drifted to text without an Active Style change.
      if (field.mode !== expected) {
        reasserting = true;
        try {
          lockModeToActiveStyle(field, active);
        } finally {
          queueMicrotask(() => {
            reasserting = false;
          });
        }
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextStyleShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        onActiveStyleChange?.("text");
        return;
      }
      if (isMathStyleShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        onActiveStyleChange?.("math");
        return;
      }

      const style = activeStyleRef.current;
      if (
        (style === "function" || style === "user1" || style === "user2") &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        event.key.length === 1 &&
        /^[a-zA-Z]$/.test(event.key)
      ) {
        event.preventDefault();
        event.stopPropagation();
        commitPendingComposition(field);
        insertStyledLetter(field, style, event.key);
      }
    };

    field.addEventListener("mode-change", onModeChange);
    field.addEventListener("keydown", onKeyDown, true);
    return () => {
      field.removeEventListener("mode-change", onModeChange);
      field.removeEventListener("keydown", onKeyDown, true);
    };
  }, [onActiveStyleChange]);

  useEffect(() => {
    onChordStatus?.(chordStatus);
  }, [chordStatus, onChordStatus]);

  useImperativeHandle(ref, () => ({
    insert(latex: string, at?: EditorSelection | null) {
      const field = fieldRef.current;
      if (!field) return;
      focusAt(field, at);
      insertAdaptedLatex(field, latex, {
        activeStyle: activeStyleRef.current,
        suppressModeLock: suppressModeLockRef,
      });
      syncEmptyPlaceholder(field);
      field.focus();
      const sink = findKeyboardSink(field);
      sink?.focus({ preventScroll: true });
    },
    load(latex: string) {
      const field = fieldRef.current;
      if (!field) return;
      commitPendingComposition(field);
      field.setValue(toMathliveTemplate(latex));
      lockModeToActiveStyle(field, activeStyleRef.current);
      syncEmptyPlaceholder(field);
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
    applyActiveStyle(id: ActiveStyleId) {
      const field = fieldRef.current;
      if (!field) return;
      applyActiveStyleToField(field, id);
    },
    executeCommand(command: string | [string, ...unknown[]]) {
      const field = fieldRef.current;
      if (!field) return false;
      try {
        return Boolean(field.executeCommand(command as never));
      } catch {
        return false;
      }
    },
  }));

  return (
    <math-field
      ref={fieldRef}
      className="mt-math-field"
      aria-label="Math editor"
      math-virtual-keyboard-policy="manual"
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
        // Transparent text/contains highlights — keep selection cyan only.
        ["--highlight-text" as string]: "transparent",
        ["--contains-highlight-background-color" as string]: "transparent",
        ["--mt-zoom" as string]: String(preset.zoomPercent / 100),
        ["--mt-view-size" as string]: viewSize,
        ["--text-font-family" as string]: "var(--mt-ds-text-font, var(--mt-text-font))",
      }}
    />
  );
  },
);
