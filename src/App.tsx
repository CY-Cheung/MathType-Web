import { useCallback, useEffect, useRef, useState } from "react";
import { copyExport, type ExportFormat } from "./adapters/clipboard";
import { parseEqHash } from "./adapters/eqHash";
import { DefineStylesDialog } from "./components/DefineStylesDialog";
import { DocxBatchPanel } from "./components/DocxBatchPanel";
import { ExportMenu } from "./components/ExportMenu";
import { FavoritesBar } from "./components/FavoritesBar";
import { MathEditor, type EditorSelection, type MathEditorHandle } from "./components/MathEditor";
import { MatrixDialog } from "./components/MatrixDialog";
import { StyleSwitcher } from "./components/StyleSwitcher";
import { Toolbar } from "./components/Toolbar";
import { matrixToLatex, type MatrixSpec } from "./core/matrixTemplate";
import { ZoomSwitcher } from "./components/ZoomSwitcher";
import {
  isExportShortcut,
  isMathStyleShortcut,
  isMatrixDialogShortcut,
  isTextStyleShortcut,
  workspaceZoomShortcutPercent,
} from "./core/shortcuts";
import { useDefineStyles } from "./hooks/useDefineStyles";
import { useWorkspaceZoom } from "./hooks/useWorkspaceZoom";
import {
  activeStyleLabel,
  DEFAULT_ACTIVE_STYLE,
  type ActiveStyleId,
} from "./types/activeStyle";
import { defaultStylePreset } from "./types/preset";

const TOAST_MS = 2400;

function keepFocus(event: { preventDefault: () => void }): void {
  event.preventDefault();
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
  const [stylesEpoch, setStylesEpoch] = useState(0);
  const [activeStyle, setActiveStyle] = useState<ActiveStyleId>(DEFAULT_ACTIVE_STYLE);
  const [cursorStyle, setCursorStyle] = useState<ActiveStyleId>(DEFAULT_ACTIVE_STYLE);
  const { prefs: stylePrefs, commit: commitStyles } = useDefineStyles();
  const { zoomPercent, setZoomPercent } = useWorkspaceZoom();

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), TOAST_MS);
  }, []);

  const changeActiveStyle = useCallback(
    (id: ActiveStyleId) => {
      setActiveStyle(id);
      setCursorStyle(id);
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
        showToast((await copyExport(format, latex)).message);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Copy failed");
      } finally {
        setExportBusy(false);
        editorRef.current?.restoreSelection(selection);
      }
    },
    [exportBusy, showToast],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (matrixOpenRef.current || stylesOpen) return;
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
  }, [changeActiveStyle, changeZoom, openMatrix, runExport, stylesOpen]);

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

  // View zoom only — export (`renderFormula`) always uses physical Full 10pt.
  const preset = { ...defaultStylePreset, zoomPercent };
  const sizeHint = `Size: Full (${preset.fullPt}pt)`;
  const faceHint = `Var: ${stylePrefs.styles.variable.font} · Text: ${stylePrefs.styles.text.font}`;
  const statusBase = toast || chordStatus || `${sizeHint} · ${faceHint}`;

  return (
    <div className="flex h-dvh flex-col bg-[#d4d4d4] sm:p-4">
      <div className="relative flex min-h-0 flex-1 flex-col border border-[#b4b4b4] bg-white shadow-sm">
        <div className="flex items-start justify-between gap-2 border-b border-[#b5b5b5] bg-[#e6e6e6] pr-1">
          <div className="min-w-0 flex-1">
            <Toolbar onInsert={(latex) => editorRef.current?.insert(latex)} onOpenMatrix={openMatrix} />
          </div>
          <div className="flex shrink-0 items-center gap-1 py-1.5">
            <StyleSwitcher
              activeStyle={activeStyle}
              onChange={changeActiveStyle}
              onOpenDefineStyles={() => setStylesOpen(true)}
            />
            <button
              type="button"
              title="Batch .docx — scan formulas (Phase 3 Step 1)"
              className={`h-7 border border-[#9a9a9a] px-2 text-[12px] leading-none hover:bg-white ${
                batchOpen ? "bg-white" : "bg-[#f7f7f7]"
              }`}
              onMouseDown={keepFocus}
              onClick={() => setBatchOpen((open) => !open)}
            >
              Batch .docx
            </button>
            <span className="hidden text-[10px] text-[#666] sm:inline">Ctrl+Shift+C</span>
            <ExportMenu busy={exportBusy} onExport={(format) => void runExport(format)} />
          </div>
        </div>
        <FavoritesBar
          onInsert={(latex) => editorRef.current?.insert(latex)}
          onCapture={() => editorRef.current?.capture() ?? ""}
        />
        <main className="relative min-h-0 flex-1">
          <MathEditor
            ref={editorRef}
            preset={preset}
            stylesEpoch={stylesEpoch}
            activeStyle={activeStyle}
            onActiveStyleChange={changeActiveStyle}
            onCursorStyleChange={setCursorStyle}
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
        <footer className="relative flex items-center justify-between gap-2 border-t border-[#c6c6c6] bg-[#f3f3f3] px-2 py-1.5 font-sans text-[12px] leading-snug text-[#1a1a1a]">
          <div className="min-w-0 flex-1 truncate">{statusBase}</div>
          <div className="flex shrink-0 items-center gap-1">
            <ZoomSwitcher zoomPercent={zoomPercent} onChange={changeZoom} />
            <StyleSwitcher
              compact
              activeStyle={cursorStyle}
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
          onClose={() => setStylesOpen(false)}
        />
      ) : null}
    </div>
  );
}
