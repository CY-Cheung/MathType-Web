import { useRef, useState } from "react";
import {
  applyFormulaEdit,
  downloadBlob,
  exportDocxSession,
  kindLabel,
  openDocxSession,
  type DocxSession,
  type ScannedFormula,
} from "../adapters/docxBatch";

type DocxBatchPanelProps = {
  onClose: () => void;
  onLoadFormula: (latex: string) => void;
  onCaptureLatex: () => string;
  onStatus: (message: string) => void;
};

function keepFocus(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

export function DocxBatchPanel({
  onClose,
  onLoadFormula,
  onCaptureLatex,
  onStatus,
}: DocxBatchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<DocxSession | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const modifiedCount = session?.formulas.filter((f) => f.modified).length ?? 0;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    setSelectedId(null);
    try {
      const next = await openDocxSession(file);
      setSession(next);
      onStatus(`Scanned ${next.fileName}: ${next.formulas.length} formula(s)`);
    } catch (err) {
      setSession(null);
      const message = err instanceof Error ? err.message : "Scan failed";
      setError(message);
      onStatus(message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const loadItem = (item: ScannedFormula) => {
    if (!item.latex.trim()) {
      onStatus("No LaTeX available for this item");
      return;
    }
    setSelectedId(item.id);
    onLoadFormula(item.latex);
    onStatus(`Loaded #${item.index} (${kindLabel(item.kind)})`);
  };

  const applySelected = () => {
    if (!session || !selectedId) {
      onStatus("Select a formula first");
      return;
    }
    try {
      const next = applyFormulaEdit(session, selectedId, onCaptureLatex());
      setSession(next);
      const item = next.formulas.find((f) => f.id === selectedId);
      onStatus(item?.modified ? `Applied #${item.index} (Modified)` : `Applied #${item?.index} (unchanged)`);
    } catch (err) {
      onStatus(err instanceof Error ? err.message : "Apply failed");
    }
  };

  const exportUpdated = async () => {
    if (!session) return;
    setBusy(true);
    try {
      downloadBlob(await exportDocxSession(session), session.fileName);
      onStatus(`Exported .docx (${modifiedCount} modified)`);
    } catch (err) {
      onStatus(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Batch .docx"
      className="absolute inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-[#999] bg-[#f7f7f7] shadow-[-4px_0_16px_rgba(0,0,0,0.12)]"
    >
      <header className="flex items-center justify-between border-b border-[#c6c6c6] bg-[#ececec] px-3 py-2">
        <div>
          <div className="text-[13px] font-medium text-[#222]">Batch .docx</div>
          <div className="text-[10px] text-[#666]">Step 2 · edit · write-back · export</div>
        </div>
        <button type="button" className="h-7 border border-[#9a9a9a] bg-white px-2 text-[12px]" onMouseDown={keepFocus} onClick={onClose}>
          Close
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-[#ddd] px-3 py-2">
        <input ref={inputRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        <button type="button" disabled={busy} className="h-8 border border-[#9a9a9a] bg-white px-3 text-[12px] disabled:opacity-50" onMouseDown={keepFocus} onClick={() => inputRef.current?.click()}>
          {busy ? "Working…" : "Upload .docx"}
        </button>
        <button type="button" disabled={!selectedId || busy} className="h-8 border border-[#9a9a9a] bg-white px-3 text-[12px] disabled:opacity-50" onMouseDown={keepFocus} onClick={applySelected}>
          Apply
        </button>
        <button type="button" disabled={modifiedCount === 0 || busy} className="h-8 border border-[#9a9a9a] bg-white px-3 text-[12px] disabled:opacity-50" onMouseDown={keepFocus} onClick={() => void exportUpdated()}>
          Export .docx
        </button>
        {session ? (
          <span className="text-[11px] text-[#444]">
            {session.fileName} · {session.formulas.length} found{modifiedCount ? ` · ${modifiedCount} modified` : ""}
          </span>
        ) : null}
      </div>

      {error ? <p className="px-3 py-2 text-[12px] text-[#a40000]">{error}</p> : null}

      <ul className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {!session && !error ? <li className="px-2 py-6 text-center text-[12px] text-[#777]">Upload a .docx, edit in MathEditor, Apply, then Export.</li> : null}
        {session?.formulas.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`mb-1 w-full overflow-hidden rounded-sm border px-2 py-1.5 text-left hover:bg-white ${selectedId === item.id ? "border-[#6a8cbf] bg-white" : "border-transparent bg-[#efefef]"}`}
              onMouseDown={keepFocus}
              onClick={() => loadItem(item)}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-medium text-[#222]">#{item.index} · {kindLabel(item.kind)}</span>
                {item.modified ? <span className="shrink-0 text-[10px] font-medium text-[#0b6e4f]">Modified</span> : null}
              </div>
              <div className="mt-0.5 truncate font-mono text-[11px] text-[#333]">{item.summary}</div>
              <div className="mt-0.5 break-all font-mono text-[10px] leading-snug text-[#777]">{item.raw}</div>
            </button>
          </li>
        ))}
        {session && session.formulas.length === 0 ? <li className="px-2 py-6 text-center text-[12px] text-[#777]">No formulas detected.</li> : null}
      </ul>

      {session?.warnings.length ? (
        <div className="border-t border-[#ddd] px-3 py-2 text-[10px] text-[#7a5a00]">
          {session.warnings.map((w) => <div key={w} className="break-all">{w}</div>)}
        </div>
      ) : null}
    </div>
  );
}
