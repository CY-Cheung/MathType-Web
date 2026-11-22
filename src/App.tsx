import { useCallback, useEffect, useRef, useState } from "react";
import { MathEditor, type EditorSelection, type MathEditorHandle } from "./components/MathEditor";
import { FavoritesBar } from "./components/FavoritesBar";
import { MatrixDialog } from "./components/MatrixDialog";
import { Toolbar } from "./components/Toolbar";
import { matrixToLatex, type MatrixSpec } from "./core/matrixTemplate";
import { isMatrixDialogShortcut } from "./core/shortcuts";
import { STATUS_BAR_LABEL } from "./types/preset";

export default function App() {
  const editorRef = useRef<MathEditorHandle>(null);
  const selectionRef = useRef<EditorSelection | null>(null);
  const matrixOpenRef = useRef(false);
  const [chordStatus, setChordStatus] = useState("");
  const [matrixOpen, setMatrixOpen] = useState(false);

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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!isMatrixDialogShortcut(event) || matrixOpenRef.current) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("input, textarea, select, [role='dialog']")) return;
      if (target.closest("math-field")) return;
      event.preventDefault();
      openMatrix();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [openMatrix]);

  return (
    <div className="flex h-dvh flex-col bg-[#d4d4d4] sm:p-4">
      <div className="flex min-h-0 flex-1 flex-col border border-[#b4b4b4] bg-white shadow-sm">
        <Toolbar onInsert={(latex) => editorRef.current?.insert(latex)} onOpenMatrix={openMatrix} />
        <FavoritesBar
          onInsert={(latex) => editorRef.current?.insert(latex)}
          onCapture={() => editorRef.current?.capture() ?? ""}
        />
        <main className="relative min-h-0 flex-1">
          <MathEditor ref={editorRef} onChordStatus={setChordStatus} onMatrixDialog={openMatrix} />
        </main>
        <footer className="border-t border-[#c6c6c6] bg-[#f3f3f3] px-2 py-1.5 font-sans text-[12px] leading-snug text-[#1a1a1a]">
          {chordStatus || STATUS_BAR_LABEL}
        </footer>
      </div>
      {matrixOpen ? <MatrixDialog onCancel={closeMatrix} onConfirm={confirmMatrix} /> : null}
    </div>
  );
}
