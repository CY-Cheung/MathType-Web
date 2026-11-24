import { useEffect, useId, useState } from "react";
import {
  FACTORY_DEFINE_SPACING,
  type DefineSpacingPrefs,
} from "../types/defineSpacing";

type DefineSpacingDialogProps = {
  prefs: DefineSpacingPrefs;
  onCommit: (prefs: DefineSpacingPrefs, persist: boolean) => void;
  onClose: () => void;
};

const FIELDS: {
  key: keyof Omit<DefineSpacingPrefs, "version">;
  label: string;
}[] = [
  { key: "lineSpacingEm", label: "Line spacing (em)" },
  { key: "numeratorGapEm", label: "Numerator gap (em)" },
  { key: "denominatorGapEm", label: "Denominator gap (em)" },
  { key: "matrixRowGapEm", label: "Matrix row spacing (em)" },
  { key: "matrixColGapEm", label: "Matrix column spacing (em)" },
];

export function DefineSpacingDialog({
  prefs,
  onCommit,
  onClose,
}: DefineSpacingDialogProps) {
  const titleId = useId();
  const [draft, setDraft] = useState<DefineSpacingPrefs>(() => ({ ...prefs }));
  const [useForNew, setUseForNew] = useState(true);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const ok = () => {
    onCommit(draft, useForNew);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-3 font-sans text-[12px] text-[#1a1a1a]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="define-spacing-dialog"
        className="flex max-h-[90dvh] w-[26rem] max-w-full flex-col overflow-hidden border border-[#6a6a6a] bg-[#f0f0f0] shadow-lg"
      >
        <h2
          id={titleId}
          className="shrink-0 border-b border-[#c0c0c0] bg-[#e8e8e8] px-3 py-1.5 text-[13px] font-semibold"
        >
          Define Spacing
        </h2>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="flex flex-col gap-2">
            {FIELDS.map((field) => (
              <label key={field.key} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                <span>{field.label}</span>
                <input
                  type="number"
                  min={0}
                  max={4}
                  step={0.05}
                  className="box-border h-[22px] w-full border border-[#7a7a7a] bg-white px-1 sm:w-24"
                  value={draft[field.key]}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [field.key]: Number(event.target.value),
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 border-t border-[#c8c8c8] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-1.5 text-[11px]">
            <input
              type="checkbox"
              checked={useForNew}
              onChange={(event) => setUseForNew(event.target.checked)}
            />
            Use for new equations
          </label>
          <div className="grid grid-cols-2 gap-1.5 sm:flex">
            <button
              type="button"
              className="h-[26px] border border-[#9a9a9a] bg-[#f7f7f7] px-2 text-[11px] hover:bg-white"
              onClick={() => setDraft({ ...FACTORY_DEFINE_SPACING })}
            >
              Factory settings
            </button>
            <button
              type="button"
              className="h-[26px] border border-[#9a9a9a] bg-[#f7f7f7] px-3 text-[12px] hover:bg-white"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="col-span-2 h-[26px] border border-[#6a6a6a] bg-[#e8e8e8] px-3 text-[12px] font-semibold hover:bg-white sm:col-span-1"
              onClick={ok}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
