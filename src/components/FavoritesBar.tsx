import { useRef } from "react";
import { MathMarkup } from "./MathMarkup";
import { useFavorites } from "../hooks/useFavorites";
import type { FavoriteItem } from "../data/favoritesTabs";

type FavoritesBarProps = {
  onInsert: (latex: string) => void;
  onCapture: () => string;
};

const LONG_PRESS_MS = 550;

function keepFocus(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

function FormulaButton({
  item,
  onInsert,
  onDelete,
}: {
  item: FavoriteItem;
  onInsert: (latex: string) => void;
  onDelete: (id: string) => void;
}) {
  const large = item.size === "large";
  const longPress = useRef<number | null>(null);
  const suppressClick = useRef(false);

  const clearLongPress = () => {
    if (longPress.current != null) {
      window.clearTimeout(longPress.current);
      longPress.current = null;
    }
  };

  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        className={`inline-flex items-center justify-center border border-[#b0b0b0] bg-white hover:border-[#6d6d6d] ${
          large ? "h-auto min-h-10 px-3 py-1" : "h-9 px-2"
        }`}
        onMouseDown={keepFocus}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          onInsert(item.latex);
        }}
        onTouchStart={() => {
          clearLongPress();
          longPress.current = window.setTimeout(() => {
            longPress.current = null;
            suppressClick.current = true;
            onDelete(item.id);
          }, LONG_PRESS_MS);
        }}
        onTouchEnd={clearLongPress}
        onTouchCancel={clearLongPress}
        onTouchMove={clearLongPress}
        title="Click to insert · long-press to remove"
      >
        <MathMarkup latex={item.latex} className={large ? "text-[14px]" : "text-[15px]"} />
      </button>
      <button
        type="button"
        aria-label="Delete favorite"
        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center border border-[#888] bg-[#fff] text-[11px] leading-none opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        onMouseDown={keepFocus}
        onClick={() => onDelete(item.id)}
      >
        ×
      </button>
    </div>
  );
}

export function FavoritesBar({ onInsert, onCapture }: FavoritesBarProps) {
  const { tabs, activeId, setActiveId, addToActive, removeItem, reset } = useFavorites();
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  const large = active.items.filter((item) => item.size === "large");
  const small = active.items.filter((item) => item.size === "small");
  const isCustom = active.id === "tab8" || active.label === "Custom";

  return (
    <div className="shrink-0 border-b border-[#b5b5b5] bg-[#f4f4f4] px-1 pb-1">
      <div className="flex items-end gap-px overflow-x-auto pt-1">
        {tabs.map((tab) => {
          const selected = tab.id === active.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`h-7 shrink-0 px-2 text-[12px] leading-none ${
                selected ? "bg-[#1a5fb4] text-white" : "bg-[#e4e4e4] text-black hover:bg-[#ececec]"
              }`}
              onMouseDown={keepFocus}
              onClick={() => setActiveId(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
        <button
          type="button"
          className="ml-2 h-7 shrink-0 border border-[#b0b0b0] bg-white px-2 text-[12px] leading-none hover:bg-[#f7f7f7]"
          onMouseDown={keepFocus}
          onClick={() => addToActive(onCapture())}
          title={isCustom ? "Add current formula to Custom" : "Add current formula to this tab"}
        >
          {isCustom ? "Add current" : "Add"}
        </button>
        <button
          type="button"
          className="h-7 shrink-0 border border-[#b0b0b0] bg-white px-2 text-[12px] leading-none hover:bg-[#f7f7f7]"
          onMouseDown={keepFocus}
          onClick={reset}
        >
          Reset
        </button>
      </div>
      <div className="mt-1 flex min-h-10 items-center gap-1 overflow-x-auto">
        {large.length === 0 && small.length === 0 ? (
          <span className="px-1 text-[12px] text-[#666]">
            {isCustom ? "Empty — Add current formula from the canvas" : "Empty"}
          </span>
        ) : (
          large.map((item) => (
            <FormulaButton key={item.id} item={item} onInsert={onInsert} onDelete={removeItem} />
          ))
        )}
      </div>
      {small.length > 0 ? (
        <div className="mt-1 flex items-center gap-1 overflow-x-auto">
          {small.map((item) => (
            <FormulaButton key={item.id} item={item} onInsert={onInsert} onDelete={removeItem} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
