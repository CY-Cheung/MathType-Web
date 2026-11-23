import { useRef, useState } from "react";
import type { ExportFormat } from "../adapters/clipboard";
import { EXPORT_SHORTCUT } from "../core/shortcuts";
import { FloatingPortal } from "./FloatingPortal";

type ExportMenuProps = {
  busy?: boolean;
  onExport: (format: ExportFormat) => void;
};

function keepFocus(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

const OPTIONS: { format: ExportFormat; label: string; hint: string }[] = [
  { format: "mathml", label: "MathML", hint: "Word native equation" },
  { format: "png", label: "PNG (4×)", hint: "Transparent · #eq= round-trip · Word" },
  { format: "svg", label: "SVG", hint: "Vector · no jaggies" },
  { format: "latex", label: "LaTeX", hint: "Plain text · fallback" },
];

export function ExportMenu({ busy = false, onExport }: ExportMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const run = (format: ExportFormat) => {
    setOpen(false);
    onExport(format);
  };

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
        className="min-w-[220px] border border-[#999] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt.format}
            type="button"
            className="flex w-full flex-col items-start gap-0.5 border-b border-[#ececec] px-2.5 py-1.5 text-left last:border-b-0 hover:bg-[#f4f7fb]"
            onMouseDown={keepFocus}
            onClick={() => run(opt.format)}
          >
            <span className="text-[12px] font-medium text-[#222]">{opt.label}</span>
            <span className="text-[10px] text-[#666]">{opt.hint}</span>
          </button>
        ))}
      </FloatingPortal>
    </div>
  );
}
