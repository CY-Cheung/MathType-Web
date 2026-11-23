import { useEffect, useId, useRef, useState } from "react";
import {
  clampWorkspaceZoomPercent,
  isWorkspaceZoomPreset,
  WORKSPACE_ZOOM_MAX,
  WORKSPACE_ZOOM_MIN,
  WORKSPACE_ZOOM_PRESETS,
} from "../types/workspaceZoom";

type ZoomSwitcherProps = {
  zoomPercent: number;
  onChange: (percent: number) => void;
};

function keepFocus(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

/**
 * MathType-style workspace Zoom control (status bar).
 * View-only — does not change PNG (4×) / Word export metrics.
 */
export function ZoomSwitcher({ zoomPercent, onChange }: ZoomSwitcherProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(zoomPercent));

  useEffect(() => {
    setDraft(String(zoomPercent));
  }, [zoomPercent]);

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

  useEffect(() => {
    if (open) {
      const id = window.requestAnimationFrame(() => inputRef.current?.select());
      return () => window.cancelAnimationFrame(id);
    }
  }, [open]);

  const commitDraft = () => {
    const parsed = Number(String(draft).replace(/%/g, "").trim());
    const next = clampWorkspaceZoomPercent(parsed);
    onChange(next);
    setDraft(String(next));
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title={`Zoom: ${zoomPercent}% (view only — export stays 10pt)`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        data-testid="workspace-zoom-switcher"
        className={`inline-flex h-[22px] items-center border border-transparent px-1 text-[12px] leading-none hover:border-[#9a9a9a] hover:bg-white ${
          open ? "border-[#9a9a9a] bg-white" : ""
        }`}
        onMouseDown={keepFocus}
        onClick={() => setOpen((value) => !value)}
      >
        Zoom: <span className="ml-0.5 font-semibold">{zoomPercent}%</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          data-testid="workspace-zoom-menu"
          className="absolute bottom-full right-0 z-50 mb-px min-w-[10.5rem] border border-[#7a7a7a] bg-[#f7f7f7] py-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
        >
          {WORKSPACE_ZOOM_PRESETS.map((preset) => {
            const selected = zoomPercent === preset;
            return (
              <button
                key={preset}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`flex w-full items-center justify-between gap-3 px-2.5 py-1 text-left text-[12px] hover:bg-[#dce8f8] ${
                  selected ? "bg-[#cfe0f5] font-semibold" : ""
                }`}
                onMouseDown={keepFocus}
                onClick={() => {
                  onChange(preset);
                  setOpen(false);
                }}
              >
                <span>{preset}%</span>
                {preset === 100 ? (
                  <span className="text-[10px] font-normal text-[#666]">Ctrl+1</span>
                ) : null}
                {preset === 200 ? (
                  <span className="text-[10px] font-normal text-[#666]">Ctrl+2</span>
                ) : null}
                {preset === 300 ? (
                  <span className="text-[10px] font-normal text-[#666]">Ctrl+3</span>
                ) : null}
                {preset === 400 ? (
                  <span className="text-[10px] font-normal text-[#666]">Ctrl+4</span>
                ) : null}
              </button>
            );
          })}
          <div className="my-0.5 border-t border-[#c0c0c0]" />
          <div className="px-2.5 py-1.5" role="none">
            <label className="mb-1 block text-[10px] text-[#666]" htmlFor={`${menuId}-custom`}>
              Custom ({WORKSPACE_ZOOM_MIN}–{WORKSPACE_ZOOM_MAX}%)
            </label>
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                id={`${menuId}-custom`}
                type="number"
                min={WORKSPACE_ZOOM_MIN}
                max={WORKSPACE_ZOOM_MAX}
                step={1}
                value={draft}
                className="h-7 w-16 border border-[#9a9a9a] bg-white px-1.5 text-[12px] outline-none focus:border-[#6a8cbf]"
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitDraft();
                  }
                }}
              />
              <button
                type="button"
                className="h-7 border border-[#9a9a9a] bg-white px-2 text-[12px] hover:bg-[#efefef]"
                onMouseDown={keepFocus}
                onClick={commitDraft}
              >
                OK
              </button>
            </div>
            {!isWorkspaceZoomPreset(zoomPercent) ? (
              <div className="mt-1 text-[10px] text-[#666]">Current: custom {zoomPercent}%</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
