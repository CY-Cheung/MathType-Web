import { useEffect, useRef, useState } from "react";
import { MathMarkup } from "./MathMarkup";
import { MATRIX_DIALOG_SHORTCUT } from "../core/shortcuts";
import {
  symbolPalettes,
  templatePalettes,
  tooltipText,
  type ToolbarItem,
  type ToolbarPalette,
} from "../data/toolbarItems";

type ToolbarProps = {
  onInsert: (latex: string) => void;
  onOpenMatrix: () => void;
};

function keepFocus(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

const buttonClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-visible p-1 leading-none";

function ItemButton({
  entry,
  onInsert,
}: {
  entry: ToolbarItem;
  onInsert: (latex: string) => void;
}) {
  const tip = tooltipText(entry);
  return (
    <button
      type="button"
      title={tip}
      className={`group relative border border-transparent bg-white text-[15px] hover:border-[#7d7d7d] hover:bg-[#f4f7fb] ${buttonClass}`}
      onMouseDown={keepFocus}
      onClick={() => onInsert(entry.latex)}
    >
      <MathMarkup latex={entry.latex} className="text-[15px]" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 hidden -translate-x-1/2 whitespace-nowrap border border-[#8d8d8d] bg-[#fffef6] px-1.5 py-0.5 text-[11px] text-[#222] shadow-sm group-hover:block">
        {tip}
      </span>
    </button>
  );
}

function PaletteButton({
  palette,
  open,
  onToggle,
  onInsert,
  onOpenMatrix,
}: {
  palette: ToolbarPalette;
  open: boolean;
  onToggle: () => void;
  onInsert: (latex: string) => void;
  onOpenMatrix?: () => void;
}) {
  const icon = palette.icon ?? palette.items[0]?.latex ?? "";
  return (
    <div className="relative">
      <button
        type="button"
        title={palette.label}
        aria-expanded={open}
        className={`border text-[15px] ${buttonClass} ${
          open
            ? "border-[#6f6f6f] bg-white"
            : "border-[#c8c8c8] bg-[#f7f7f7] hover:bg-white"
        }`}
        onMouseDown={keepFocus}
        onClick={onToggle}
      >
        <MathMarkup latex={icon} className="text-[15px]" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-40 mt-px grid w-max grid-cols-4 gap-px border border-[#999] bg-[#d7d7d7] p-px shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
          {palette.items.map((entry) => (
            <ItemButton key={entry.id} entry={entry} onInsert={onInsert} />
          ))}
          {onOpenMatrix ? (
            <button
              type="button"
              title={`Insert Matrix... / 自訂矩陣 (${MATRIX_DIALOG_SHORTCUT})`}
              className="col-span-4 h-8 bg-white px-2 text-left text-[12px] leading-none hover:bg-[#f4f7fb]"
              onMouseDown={(event) => event.preventDefault()}
              onClick={onOpenMatrix}
            >
              Insert Matrix... / 自訂矩陣
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function Toolbar({ onInsert, onOpenMatrix }: ToolbarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!openId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpenId(null);
    };
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenId(null);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [openId]);

  const insertAndClose = (latex: string) => {
    onInsert(latex);
    setOpenId(null);
  };

  const row = (palettes: ToolbarPalette[]) => (
    <div className="flex w-max min-w-full flex-nowrap items-center gap-px py-px">
      {palettes.map((palette) => (
        <PaletteButton
          key={palette.id}
          palette={palette}
          open={openId === palette.id}
          onToggle={() => setOpenId((current) => (current === palette.id ? null : palette.id))}
          onInsert={insertAndClose}
          onOpenMatrix={
            palette.id === "matrices"
              ? () => {
                  setOpenId(null);
                  onOpenMatrix();
                }
              : undefined
          }
        />
      ))}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className="min-w-0 shrink-0 bg-transparent px-1 py-0.5 text-[#222]"
    >
      {row(symbolPalettes)}
      {row(templatePalettes)}
    </div>
  );
}
