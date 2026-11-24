import { useCallback, useEffect, useRef, useState } from "react";
import { copyExport, type ExportFormat } from "./adapters/clipboard";
import { parseEqHash } from "./adapters/eqHash";
import { DefineSizesDialog } from "./components/DefineSizesDialog";
import { DefineSpacingDialog } from "./components/DefineSpacingDialog";
import { DefineStylesDialog } from "./components/DefineStylesDialog";
import { DocxBatchPanel } from "./components/DocxBatchPanel";
import { ExportMenu } from "./components/ExportMenu";
import { FavoritesBar } from "./components/FavoritesBar";
import { MathEditor, type EditorSelection, type MathEditorHandle } from "./components/MathEditor";
import { MenuBar, type MenuBarAlignAction, type MenuBarEditAction } from "./components/MenuBar";
import { MatrixDialog } from "./components/MatrixDialog";
import { ShortcutsHelpDialog } from "./components/ShortcutsHelpDialog";
import { StyleSwitcher } from "./components/StyleSwitcher";
import { Toolbar } from "./components/Toolbar";
import { formatAlignLatex } from "./core/alignFormat";
import { matrixToLatex, type MatrixSpec } from "./core/matrixTemplate";
import { ZoomSwitcher } from "./components/ZoomSwitcher";
import {
  isExportShortcut,
  isMathStyleShortcut,
  isMatrixDialogShortcut,
  isTextStyleShortcut,
  workspaceZoomShortcutPercent,
} from "./core/shortcuts";
import { useDefineSizes } from "./hooks/useDefineSizes";
import { useDefineSpacing } from "./hooks/useDefineSpacing";
import { useDefineStyles } from "./hooks/useDefineStyles";
import { useExportPrefs } from "./hooks/useExportPrefs";
import { useVisualViewportLock } from "./hooks/useVisualViewportLock";
import { useWorkspaceZoom } from "./hooks/useWorkspaceZoom";
import {
  activeStyleLabel,
  DEFAULT_ACTIVE_STYLE,
  type ActiveStyleId,
} from "./types/activeStyle";
import { defaultStylePreset } from "./types/preset";

const TOAST_MS = 2400;

const ALIGN_TOAST: Record<MenuBarAlignAction, string> = {
  left: "Align Left",
  center: "Align Center",
  right: "Align Right",
  eq: "Align at =",
};

function keepFocus(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

function selectionCollapsed(selection: EditorSelection): boolean {
  return selection.ranges.every(([start, end]) => start === end);
}

export default function App() {
  const editorRef = useRef<MathEditorHandle>(null);
  const selectionRef = useRef<EditorSelection | null>(null);
  const matrixOpenRef = useRef(false);
  const toastTimer = useRef<number | null>(null);
  const [chordStatus, setChordStatus] = useState("");
  const [toast, setToast] = useState("");
  const [exportBusy, setExportBusy] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [stylesOpen, setStylesOpen] = useState(false);
  const [sizesOpen, setSizesOpen] = useState(false);
  const [spacingOpen, setSpacingOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [stylesEpoch, setStylesEpoch] = useState(0);
  // Single source for toolbar + status-bar Style (default Math).
  const [activeStyle, setActiveStyle] = useState<ActiveStyleId>(DEFAULT_ACTIVE_STYLE);
  const { prefs: stylePrefs, commit: commitStyles } = useDefineStyles();
  const { prefs: sizePrefs, commit: commitSizes, presetFields } = useDefineSizes();
  const { prefs: spacingPrefs, commit: commitSpacing } = useDefineSpacing();
  const { zoomPercent, setZoomPercent } = useWorkspaceZoom();
  const { plainImageNoLink, setPlainImageNoLink } = useExportPrefs();
  const viewportHeight = useVisualViewportLock();

  const dialogOpen =
    matrixOpen || stylesOpen || sizesOpen || spacingOpen || shortcutsOpen;

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), TOAST_MS);
  }, []);

  const changeActiveStyle = useCallback(
    (id: ActiveStyleId) => {
      setActiveStyle(id);
      showToast(`Style: ${activeStyleLabel(id)}`);
    },
    [showToast],
  );

  const changeZoom = useCallback(
    (percent: number) => {
      const next = setZoomPercent(percent);
      showToast(`Zoom: ${next}% (view only)`);
      return next;
    },
    [setZoomPercent, showToast],
  );

  const openMatrix = useCallback(() => {
    if (matrixOpenRef.current) return;
    matrixOpenRef.current = true;
    selectionRef.current = editorRef.current?.captureSelection() ?? null;
    setMatrixOpen(true);
  }, []);

  const closeMatrix = useCallback(() => {
    matrixOpenRef.current = false;
    setMatrixOpen(false);
    editorRef.current?.restoreSelection(selectionRef.current);
  }, []);

  const confirmMatrix = useCallback((spec: MatrixSpec) => {
    const at = selectionRef.current;
    matrixOpenRef.current = false;
    setMatrixOpen(false);
    editorRef.current?.insert(matrixToLatex(spec), at);
  }, []);

  const runAlign = useCallback(
    (action: MenuBarAlignAction) => {
      const editor = editorRef.current;
      if (!editor) return;
      const selection = editor.captureSelection();
      const collapsed = selectionCollapsed(selection);
      const latex = collapsed ? editor.captureLatex() : editor.capture();
      const next = formatAlignLatex(latex, action);
      if (collapsed) editor.load(next);
      else editor.insert(next, selection);
      showToast(ALIGN_TOAST[action]);
    },
    [showToast],
  );

  const runExport = useCallback(
    async (format: ExportFormat) => {
      if (exportBusy || matrixOpenRef.current) return;
      const latex = editorRef.current?.captureLatex() ?? "";
      if (!latex.trim()) {
        showToast("Nothing to copy");
        return;
      }
      const selection = editorRef.current?.captureSelection() ?? null;
      setExportBusy(true);
      try {
        showToast(
          (
            await copyExport(format, latex, {
              plainImageNoLink,
            })
          ).message,
        );
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Copy failed");
      } finally {
        setExportBusy(false);
        editorRef.current?.restoreSelection(selection);
      }
    },
    [exportBusy, plainImageNoLink, showToast],
  );

  const togglePlainImageNoLink = useCallback(() => {
    const next = setPlainImageNoLink(!plainImageNoLink);
    showToast(
      next
        ? "Word PNG: plain image (no hyperlink)"
        : "Word PNG: linked image (#eq=)",
    );
  }, [plainImageNoLink, setPlainImageNoLink, showToast]);

  const runEdit = useCallback(
    (action: MenuBarEditAction) => {
      const editor = editorRef.current;
      if (!editor) return;
      const map: Record<MenuBarEditAction, string> = {
        undo: "undo",
        redo: "redo",
        cut: "cutToClipboard",
        copy: "copyToClipboard",
        paste: "pasteFromClipboard",
        selectAll: "selectAll",
        clear: "deleteAll",
      };
      editor.executeCommand(map[action]);
      if (action === "clear") showToast("Cleared");
    },
    [showToast],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (matrixOpenRef.current || dialogOpen) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("input, textarea, select, [role='dialog']")) return;

      // Workspace zoom (view-only). Ctrl+1/2/3/4 — before chord handlers steal Digit keys.
      const zoomShortcut = workspaceZoomShortcutPercent(event);
      if (zoomShortcut != null) {
        event.preventDefault();
        event.stopPropagation();
        changeZoom(zoomShortcut);
        return;
      }

      // Style shortcuts when focus is outside math-field (editor handles in-field).
      if (!target.closest("math-field")) {
        if (isTextStyleShortcut(event)) {
          event.preventDefault();
          event.stopPropagation();
          changeActiveStyle("text");
          return;
        }
        if (isMathStyleShortcut(event)) {
          event.preventDefault();
          event.stopPropagation();
          changeActiveStyle("math");
          return;
        }
      }

      if (isExportShortcut(event)) {
        event.preventDefault();
        void runExport("mathml");
        return;
      }
      if (!isMatrixDialogShortcut(event) || target.closest("math-field")) return;
      event.preventDefault();
      openMatrix();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [changeActiveStyle, changeZoom, dialogOpen, openMatrix, runExport]);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  // SPEC Phase 2: load `#eq=<lz-string>` on boot and hashchange.
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash;
      if (!hash || !hash.includes("eq=")) return;
      const latex = parseEqHash(hash);
      if (!latex) {
        showToast("Invalid #eq= link");
        return;
      }
      editorRef.current?.load(latex);
      showToast("Loaded formula from #eq=");
    };
    const id = window.requestAnimationFrame(applyHash);
    window.addEventListener("hashchange", applyHash);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("hashchange", applyHash);
    };
  }, [showToast]);

  // View zoom only — export (`renderFormula`) uses Define Sizes Full pt + 4× DPI.
  const preset = { ...defaultStylePreset, ...presetFields, zoomPercent };
  const sizeHint = `Size: Full (${preset.fullPt}pt)`;
  const faceHint = `Var: ${stylePrefs.styles.variable.font} · Text: ${stylePrefs.styles.text.font}`;
  const statusBase = toast || chordStatus || `${sizeHint} · ${faceHint}`;

  const batchCopyControls = (
    <>
      <button
        type="button"
        title="Batch .docx — scan formulas (Phase 3 Step 1)"
        className={`h-7 border border-[#9a9a9a] px-2 text-[12px] leading-none hover:bg-white ${
          batchOpen ? "bg-white" : "bg-[#f7f7f7]"
        }`}
        onMouseDown={keepFocus}
        onClick={() => setBatchOpen((open) => !open)}
      >
        Batch
      </button>
      <ExportMenu
        busy={exportBusy}
        plainImageNoLink={plainImageNoLink}
        onPlainImageNoLinkChange={togglePlainImageNoLink}
        onExport={(format) => void runExport(format)}
      />
    </>
  );

  return (
    <div
      className="flex w-full max-w-[100vw] flex-col overflow-hidden bg-[#d4d4d4] sm:p-4"
      style={{
        height: viewportHeight > 0 ? `${viewportHeight}px` : "100dvh",
        maxHeight: viewportHeight > 0 ? `${viewportHeight}px` : "100dvh",
      }}
    >
      <div className="relative flex min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden border border-[#b4b4b4] bg-white shadow-sm">
        <div className="shrink-0">
          <MenuBar
            activeStyle={activeStyle}
            zoomPercent={zoomPercent}
            plainImageNoLink={plainImageNoLink}
            onActiveStyleChange={changeActiveStyle}
            onZoomChange={changeZoom}
            onPlainImageNoLinkChange={togglePlainImageNoLink}
            onOpenDefineStyles={() => setStylesOpen(true)}
            onOpenDefineSizes={() => setSizesOpen(true)}
            onOpenDefineSpacing={() => setSpacingOpen(true)}
            onOpenMatrix={openMatrix}
            onAlign={runAlign}
            onOpenShortcutsHelp={() => setShortcutsOpen(true)}
            onEdit={runEdit}
            onExportMathMl={() => void runExport("mathml")}
          />
        </div>
        {/* Narrow: Batch/Copy on their own top row; sm+: same row, right of symbols. */}
        <div className="flex min-w-0 shrink-0 flex-col border-b border-[#b5b5b5] bg-[#e6e6e6] sm:flex-row sm:items-stretch sm:pr-1">
          <div className="order-1 flex shrink-0 items-center justify-end gap-1 px-1 py-1 sm:order-2 sm:self-start sm:py-1.5">
            {batchCopyControls}
          </div>
          <div className="order-2 min-w-0 flex-1 overflow-x-auto sm:order-1">
            <Toolbar onInsert={(latex) => editorRef.current?.insert(latex)} onOpenMatrix={openMatrix} />
          </div>
        </div>
        <div className="shrink-0">
          <FavoritesBar
            onInsert={(latex) => editorRef.current?.insert(latex)}
            onCapture={() => editorRef.current?.capture() ?? ""}
          />
        </div>
        <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <MathEditor
            ref={editorRef}
            preset={preset}
            stylesEpoch={stylesEpoch}
            activeStyle={activeStyle}
            onActiveStyleChange={changeActiveStyle}
            onChordStatus={setChordStatus}
            onMatrixDialog={openMatrix}
          />
          {batchOpen ? (
            <DocxBatchPanel
              onClose={() => setBatchOpen(false)}
              onLoadFormula={(latex) => editorRef.current?.load(latex)}
              onCaptureLatex={() => editorRef.current?.captureLatex() ?? ""}
              onStatus={showToast}
            />
          ) : null}
        </main>
        <footer className="relative flex min-w-0 shrink-0 items-center justify-between gap-2 border-t border-[#c6c6c6] bg-[#f3f3f3] px-2 py-1.5 font-sans text-[12px] leading-snug text-[#1a1a1a]">
          <div className="min-w-0 flex-1 truncate">{statusBase}</div>
          <div className="flex shrink-0 items-center gap-1">
            <ZoomSwitcher zoomPercent={zoomPercent} onChange={changeZoom} />
            <StyleSwitcher
              compact
              activeStyle={activeStyle}
              onChange={changeActiveStyle}
              onOpenDefineStyles={() => setStylesOpen(true)}
            />
          </div>
          {toast ? (
            <span
              className="pointer-events-none absolute bottom-full right-2 mb-1 rounded-sm border border-[#8d8d8d] bg-[#fffef6] px-2 py-1 text-[11px] text-[#222] shadow-sm"
              role="status"
            >
              {toast}
            </span>
          ) : null}
        </footer>
      </div>
      {matrixOpen ? <MatrixDialog onCancel={closeMatrix} onConfirm={confirmMatrix} /> : null}
      {stylesOpen ? (
        <DefineStylesDialog
          prefs={stylePrefs}
          onCommit={(next, persist) => {
            commitStyles(next, persist);
            setStylesEpoch((n) => n + 1);
            showToast("Styles applied");
          }}
          onLocalFontsChange={() => {
            setStylesEpoch((n) => n + 1);
          }}
          onClose={() => setStylesOpen(false)}
        />
      ) : null}
      {sizesOpen ? (
        <DefineSizesDialog
          prefs={sizePrefs}
          onCommit={(next, persist) => {
            commitSizes(next, persist);
            showToast("Sizes applied");
          }}
          onClose={() => setSizesOpen(false)}
        />
      ) : null}
      {spacingOpen ? (
        <DefineSpacingDialog
          prefs={spacingPrefs}
          onCommit={(next, persist) => {
            commitSpacing(next, persist);
            showToast("Spacing applied");
          }}
          onClose={() => setSpacingOpen(false)}
        />
      ) : null}
      {shortcutsOpen ? (
        <ShortcutsHelpDialog onClose={() => setShortcutsOpen(false)} />
      ) : null}
    </div>
  );
}
