import { useEffect, useId, useRef, useState } from "react";
import {
  ACTIVE_STYLE_ORDER,
  activeStyleLabel,
  type ActiveStyleId,
} from "../types/activeStyle";

type StyleSwitcherProps = {
  activeStyle: ActiveStyleId;
  onChange: (id: ActiveStyleId) => void;
  onOpenDefineStyles: () => void;
  /** Compact trigger for status-bar click. */
  compact?: boolean;
};

function keepFocus(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

/**
 * MathType-style Active Style menu (toolbar / status bar).
 * Separate from the Define Styles dialog — this only switches the live style.
 */
export function StyleSwitcher({
  activeStyle,
  onChange,
  onOpenDefineStyles,
  compact = false,
}: StyleSwitcherProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const label = activeStyleLabel(activeStyle);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title={`Style: ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        data-testid={compact ? "active-style-status" : "active-style-switcher"}
        className={
          compact
            ? `inline-flex h-[22px] items-center border border-transparent px-1 text-[12px] leading-none hover:border-[#9a9a9a] hover:bg-white ${
                open ? "border-[#9a9a9a] bg-white" : ""
              }`
            : `h-7 border border-[#9a9a9a] px-2 text-[12px] leading-none hover:bg-white ${
                open ? "bg-white" : "bg-[#f7f7f7]"
              }`
        }
        onMouseDown={keepFocus}
        onClick={() => setOpen((value) => !value)}
      >
        {compact ? (
          <span>
            Style: <span className="font-semibold">{label}</span>
          </span>
        ) : (
          <span>
            Style: <span className="font-semibold">{label}</span> ▾
          </span>
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          data-testid="active-style-menu"
          className="absolute right-0 top-full z-50 mt-px min-w-[11rem] border border-[#7a7a7a] bg-[#f7f7f7] py-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
        >
          {ACTIVE_STYLE_ORDER.map((row) => {
            const selected = row.id === activeStyle;
            return (
              <button
                key={row.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`flex w-full items-center justify-between gap-3 px-2.5 py-1 text-left text-[12px] hover:bg-[#dce8f8] ${
                  selected ? "bg-[#cfe0f5] font-semibold" : ""
                }`}
                onMouseDown={keepFocus}
                onClick={() => {
                  onChange(row.id);
                  setOpen(false);
                }}
              >
                <span>{row.label}</span>
                {row.shortcut ? (
                  <span className="text-[10px] font-normal text-[#666]">{row.shortcut}</span>
                ) : null}
              </button>
            );
          })}
          <div className="my-0.5 border-t border-[#c0c0c0]" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-2.5 py-1 text-left text-[12px] hover:bg-[#dce8f8]"
            onMouseDown={keepFocus}
            onClick={() => {
              setOpen(false);
              onOpenDefineStyles();
            }}
          >
            Define Styles…
          </button>
        </div>
      ) : null}
    </div>
  );
}
