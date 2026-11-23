import { useEffect, useId } from "react";
import {
  FONT_FACE_OPTIONS,
  fontFaceLabel,
  type FontFaceId,
  type FontStylePrefs,
} from "../types/fontStyle";

type FontStyleDialogProps = {
  prefs: FontStylePrefs;
  onMathFontChange: (id: FontFaceId) => void;
  onTextFontChange: (id: FontFaceId) => void;
  onReset: () => void;
  onClose: () => void;
};

function FontSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: FontFaceId;
  onChange: (id: FontFaceId) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[12px]" htmlFor={id}>
      <span className="font-semibold text-[#222]">{label}</span>
      <select
        id={id}
        className="h-8 border border-[#9a9a9a] bg-white px-2 text-[13px] text-[#1a1a1a]"
        value={value}
        onChange={(event) => onChange(event.target.value as FontFaceId)}
      >
        {FONT_FACE_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {fontFaceLabel(option.id)}
          </option>
        ))}
      </select>
      <span
        className="truncate rounded-sm border border-[#d0d0d0] bg-white px-2 py-1.5 text-[16px] leading-snug text-[#111]"
        style={{ fontFamily: `"${FONT_FACE_OPTIONS.find((o) => o.id === value)?.family}"` }}
        aria-hidden
      >
        Aa Bb Cc 123 αβγ 中文
      </span>
    </label>
  );
}

/** Classic MathType-style Style / Font Settings dialog. */
export function FontStyleDialog({
  prefs,
  onMathFontChange,
  onTextFontChange,
  onReset,
  onClose,
}: FontStyleDialogProps) {
  const titleId = useId();
  const mathId = useId();
  const textId = useId();

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 font-sans text-[13px] text-[#1a1a1a]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="font-style-dialog"
        className="w-[22rem] max-w-full border border-[#8d8d8d] bg-[#f3f3f3] shadow-lg"
      >
        <h2
          id={titleId}
          className="border-b border-[#c6c6c6] bg-[#e6e6e6] px-3 py-1.5 text-[13px] font-semibold"
        >
          Style / Font Settings
          <span className="ml-1 font-normal text-[#555]">（樣式／字體設定）</span>
        </h2>
        <div className="flex flex-col gap-3 px-3 py-3">
          <p className="text-[11px] leading-snug text-[#555]">
            Math 用於變數／數字；Text 用於{" "}
            <code className="rounded-sm bg-[#ececec] px-0.5">\text{"{}"}</code>{" "}
            正文。伸縮符號仍由 MathLive／KaTeX 字型繪製。
          </p>
          <FontSelect
            id={mathId}
            label="Math Font"
            value={prefs.mathFontId}
            onChange={onMathFontChange}
          />
          <FontSelect
            id={textId}
            label="Text Font"
            value={prefs.textFontId}
            onChange={onTextFontChange}
          />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-[#d4d4d4] pt-3">
            <button
              type="button"
              className="h-8 border border-[#9a9a9a] bg-[#f7f7f7] px-2.5 text-[12px] hover:bg-white"
              onClick={onReset}
            >
              Reset to Default（重設為預設）
            </button>
            <button
              type="button"
              className="h-8 border border-[#6a6a6a] bg-[#e8e8e8] px-3 text-[12px] font-semibold hover:bg-white"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
