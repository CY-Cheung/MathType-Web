import { useRef, useState } from "react";
import type { ExportFormat } from "../adapters/clipboard";
import { EXPORT_SHORTCUT } from "../core/shortcuts";
import {
  dpiForExportScale,
  EXPORT_SCALE_PRESETS,
  type ExportScale,
} from "../types/exportPrefs";
import { FloatingPortal } from "./FloatingPortal";

type ExportMenuProps = {
  busy?: boolean;
  plainImageNoLink: boolean;
  exportScale: ExportScale;
  onPlainImageNoLinkChange: () => void;
  onExportScaleChange: (scale: ExportScale) => void;
  onExport: (format: ExportFormat) => void;
};

function keepFocus(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

export function ExportMenu({
  busy = false,
  plainImageNoLink,
  exportScale,
  onPlainImageNoLinkChange,
  onExportScaleChange,
  onExport,
}: ExportMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const run = (format: ExportFormat) => {
    setOpen(false);
    onExport(format);
  };

  const dpi = dpiForExportScale(exportScale);

  return (
    <div ref={rootRef} className="relative flex items-stretch">
      <button
        type="button"
        title={`Copy MathML (${EXPORT_SHORTCUT})`}
        disabled={busy}
        className="h-7 border border-[#9a9a9a] border-r-0 bg-[#f7f7f7] px-2 text-[12px] leading-none text-[#222] hover:bg-white disabled:opacity-50"
        onMouseDown={keepFocus}
        onClick={() => run("mathml")}
      >
        Copy
      </button>
      <button
        ref={triggerRef}
        type="button"
        title="Export format"
        aria-expanded={open}
        disabled={busy}
        className={`h-7 border border-[#9a9a9a] bg-[#f7f7f7] px-1.5 text-[10px] leading-none text-[#222] hover:bg-white disabled:opacity-50 ${
          open ? "bg-white" : ""
        }`}
        onMouseDown={keepFocus}
        onClick={() => setOpen((v) => !v)}
      >
        ▾
      </button>
      <FloatingPortal
        open={open}
        anchorRef={triggerRef}
        onClose={() => setOpen(false)}
        align="end"
        zIndex={70}
        insideRefs={[rootRef]}
        className="min-w-[260px] border border-[#999] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
      >
        <button
          type="button"
          className="flex w-full flex-col items-start gap-0.5 border-b border-[#ececec] px-2.5 py-1.5 text-left hover:bg-[#f4f7fb]"
          onMouseDown={keepFocus}
          onClick={() => run("mathml")}
        >
          <span className="text-[12px] font-medium text-[#222]">MathML</span>
          <span className="text-[10px] text-[#666]">Word native equation</span>
        </button>
        <button
          type="button"
          className="flex w-full flex-col items-start gap-0.5 border-b border-[#ececec] px-2.5 py-1.5 text-left hover:bg-[#f4f7fb]"
          onMouseDown={keepFocus}
          onClick={() => run("png")}
        >
          <span className="text-[12px] font-medium text-[#222]">
            PNG ({exportScale}× · {dpi} DPI)
          </span>
          <span className="text-[10px] text-[#666]">Transparent · Word paste</span>
        </button>
        <div className="border-b border-[#ececec] px-2.5 py-1.5">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#666]">
            PNG resolution
          </div>
          <div className="flex flex-col gap-0.5">
            {EXPORT_SCALE_PRESETS.map((scale) => {
              const scaleDpi = dpiForExportScale(scale);
              const selected = scale === exportScale;
              return (
                <button
                  key={scale}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className="flex w-full items-center gap-2 px-1 py-1 text-left text-[12px] hover:bg-[#f4f7fb]"
                  onMouseDown={keepFocus}
                  onClick={() => onExportScaleChange(scale)}
                >
                  <span className="inline-block w-3 shrink-0 text-center text-[10px]">
                    {selected ? "●" : "○"}
                  </span>
                  <span>
                    {scale}× ({scaleDpi} DPI)
                    {scale === 6 ? " · default" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          className="flex w-full flex-col items-start gap-0.5 border-b border-[#ececec] px-2.5 py-1.5 text-left hover:bg-[#f4f7fb]"
          onMouseDown={keepFocus}
          onClick={() => run("svg")}
        >
          <span className="text-[12px] font-medium text-[#222]">SVG</span>
          <span className="text-[10px] text-[#666]">Vector · no jaggies</span>
        </button>
        <button
          type="button"
          className="flex w-full flex-col items-start gap-0.5 border-b border-[#ececec] px-2.5 py-1.5 text-left hover:bg-[#f4f7fb]"
          onMouseDown={keepFocus}
          onClick={() => run("latex")}
        >
          <span className="text-[12px] font-medium text-[#222]">LaTeX</span>
          <span className="text-[10px] text-[#666]">Plain text · fallback</span>
        </button>
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={plainImageNoLink}
          title="純圖貼上（無超連結藍底線）"
          className="flex w-full items-start gap-2 px-2.5 py-1.5 text-left hover:bg-[#f4f7fb]"
          onMouseDown={keepFocus}
          onClick={() => {
            onPlainImageNoLinkChange();
          }}
        >
          <span className="mt-0.5 inline-block w-3 shrink-0 text-center text-[10px] text-[#222]">
            {plainImageNoLink ? "✓" : ""}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[12px] font-medium text-[#222]">
              Plain Image for Word (No Hyperlink)
            </span>
            <span className="text-[10px] text-[#666]">
              純圖貼上（無超連結藍底線）· PNG only
            </span>
          </span>
        </button>
      </FloatingPortal>
    </div>
  );
}
