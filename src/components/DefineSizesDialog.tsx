import { useEffect, useId, useState } from "react";
import {
  cloneSizeSlots,
  DEFINE_SIZE_ORDER,
  FACTORY_DEFINE_SIZES,
  type DefineSizesPrefs,
  type SizeSlotId,
  type SizeSlotValue,
} from "../types/defineSizes";

type DefineSizesDialogProps = {
  prefs: DefineSizesPrefs;
  onCommit: (prefs: DefineSizesPrefs, persist: boolean) => void;
  onClose: () => void;
};

export function DefineSizesDialog({ prefs, onCommit, onClose }: DefineSizesDialogProps) {
  const titleId = useId();
  const [draft, setDraft] = useState<DefineSizesPrefs>(() => ({
    version: 1,
    slots: cloneSizeSlots(prefs.slots),
  }));
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

  const setSlot = (id: SizeSlotId, next: Partial<SizeSlotValue>) => {
    setDraft((current) => ({
      ...current,
      slots: {
        ...current.slots,
        [id]: { ...current.slots[id], ...next },
      },
    }));
  };

  const factory = () => {
    setDraft({ version: 1, slots: cloneSizeSlots(FACTORY_DEFINE_SIZES) });
  };

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
        data-testid="define-sizes-dialog"
        className="flex max-h-[90dvh] w-[28rem] max-w-full flex-col overflow-hidden border border-[#6a6a6a] bg-[#f0f0f0] shadow-lg"
      >
        <h2
          id={titleId}
          className="shrink-0 border-b border-[#c0c0c0] bg-[#e8e8e8] px-3 py-1.5 text-[13px] font-semibold"
        >
          Define Sizes
        </h2>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="border border-[#a0a0a0] bg-[#f7f7f7]">
            <div className="grid grid-cols-[1fr_5.5rem_4.5rem] gap-1 border-b border-[#c8c8c8] bg-[#ebebeb] px-2 py-1 text-[11px] font-semibold">
              <div>Size</div>
              <div>Value</div>
              <div>Unit</div>
            </div>
            {DEFINE_SIZE_ORDER.map((row) => {
              const slot = draft.slots[row.id];
              const unitLocked = row.id === "full";
              return (
                <div
                  key={row.id}
                  className="grid grid-cols-[1fr_5.5rem_4.5rem] items-center gap-1 border-b border-[#e8e8e8] px-2 py-1 last:border-b-0"
                >
                  <div className="truncate pr-1" title={row.label}>
                    {row.label}
                  </div>
                  <input
                    type="number"
                    min={unitLocked || slot.unit === "pt" ? 4 : 10}
                    max={unitLocked || slot.unit === "pt" ? 72 : 400}
                    step={slot.unit === "pt" ? 0.5 : 1}
                    className="box-border h-[22px] w-full border border-[#7a7a7a] bg-white px-1 text-[12px]"
                    value={slot.value}
                    onChange={(event) =>
                      setSlot(row.id, { value: Number(event.target.value) })
                    }
                  />
                  <select
                    className="box-border h-[22px] w-full border border-[#7a7a7a] bg-white text-[12px]"
                    value={unitLocked ? "pt" : slot.unit}
                    disabled={unitLocked}
                    onChange={(event) =>
                      setSlot(row.id, {
                        unit: event.target.value === "%" ? "%" : "pt",
                      })
                    }
                  >
                    <option value="pt">pt</option>
                    <option value="%">%</option>
                  </select>
                </div>
              );
            })}
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
              className="h-[26px] border border-[#9a9a9a] bg-[#f7f7f7] px-2 text-[11px] hover:bg-white sm:order-first"
              onClick={factory}
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
