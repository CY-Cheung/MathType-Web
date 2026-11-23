import { useRef, useState } from "react";
import {
  kindLabel,
  scanDocxFile,
  type DocxScanResult,
  type ScannedFormula,
} from "../adapters/docxBatch";

type DocxBatchPanelProps = {
  onClose: () => void;
  onLoadFormula: (latex: string) => void;
  onStatus: (message: string) => void;
};

function keepFocus(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

export function DocxBatchPanel({ onClose, onLoadFormula, onStatus }: DocxBatchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState<DocxScanResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const pickFile = () => inputRef.current?.click();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    setSelectedId(null);
    try {
      const result = await scanDocxFile(file);
      setScan(result);
      onStatus(`Scanned ${result.fileName}: ${result.formulas.length} formula(s)`);
    } catch (err) {
      setScan(null);
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

  return (
    <div
      role="dialog"
      aria-label="Batch .docx scan"
      className="absolute inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-[#999] bg-[#f7f7f7] shadow-[-4px_0_16px_rgba(0,0,0,0.12)]"
    >
      <header className="flex items-center justify-between border-b border-[#c6c6c6] bg-[#ececec] px-3 py-2">
        <div>
          <div className="text-[13px] font-medium text-[#222]">Batch .docx</div>
          <div className="text-[10px] text-[#666]">Step 1 · scan only (no write-back)</div>
        </div>
        <button
          type="button"
          className="h-7 border border-[#9a9a9a] bg-white px-2 text-[12px] hover:bg-[#f4f7fb]"
          onMouseDown={keepFocus}
          onClick={onClose}
        >
          Close
        </button>
      </header>

      <div className="flex items-center gap-2 border-b border-[#ddd] px-3 py-2">
        <input
          ref={inputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
        <button
          type="button"
          disabled={busy}
          className="h-8 border border-[#9a9a9a] bg-white px-3 text-[12px] hover:bg-[#f4f7fb] disabled:opacity-50"
          onMouseDown={keepFocus}
          onClick={pickFile}
        >
          {busy ? "Scanning…" : "Upload .docx"}
        </button>
        {scan ? (
          <span className="text-[11px] text-[#444]">
            {scan.fileName} · {scan.formulas.length} found
          </span>
        ) : null}
      </div>

      {error ? <p className="px-3 py-2 text-[12px] text-[#a40000]">{error}</p> : null}

      <ul className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {!scan && !error ? (
          <li className="px-2 py-6 text-center text-[12px] text-[#777]">
            Upload a .docx to list #eq= links and TeX delimiters.
          </li>
        ) : null}
        {scan?.formulas.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`mb-1 w-full rounded-sm border px-2 py-1.5 text-left hover:bg-white ${
                selectedId === item.id
                  ? "border-[#6a8cbf] bg-white"
                  : "border-transparent bg-[#efefef]"
              }`}
              onMouseDown={keepFocus}
              onClick={() => loadItem(item)}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-medium text-[#222]">
                  #{item.index} · {kindLabel(item.kind)}
                </span>
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-[#333]">{item.summary}</div>
              <div className="mt-0.5 font-mono text-[10px] text-[#777]">{item.raw}</div>
            </button>
          </li>
        ))}
        {scan && scan.formulas.length === 0 ? (
          <li className="px-2 py-6 text-center text-[12px] text-[#777]">No formulas detected.</li>
        ) : null}
      </ul>

      {scan?.warnings.length ? (
        <div className="border-t border-[#ddd] px-3 py-2 text-[10px] text-[#7a5a00]">
          {scan.warnings.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
