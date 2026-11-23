import { useEffect, useId, useState } from "react";
import {
  applyPrimaryFont,
  cloneStyles,
  COMMON_FONT_PRESETS,
  DEFINE_STYLE_ORDER,
  FACTORY_DEFINE_STYLES,
  type DefineStyleId,
  type DefineStylesMode,
  type DefineStylesPrefs,
  type StyleFace,
} from "../types/defineStyles";

type DefineStylesDialogProps = {
  prefs: DefineStylesPrefs;
  /** Second arg: persist to localStorage ("Use for new equations"). */
  onCommit: (prefs: DefineStylesPrefs, persist: boolean) => void;
  onClose: () => void;
};

function FontCombo({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (font: string) => void;
}) {
  const listId = `${id}-list`;
  return (
    <>
      <input
        id={id}
        list={listId}
        className="box-border h-[22px] w-full min-w-0 border border-[#7a7a7a] bg-white px-1 text-[12px] leading-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        autoComplete="off"
      />
      <datalist id={listId}>
        {COMMON_FONT_PRESETS.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  );
}

/** MathType 6.9b–style Define Styles (Simple / Advanced). */
export function DefineStylesDialog({ prefs, onCommit, onClose }: DefineStylesDialogProps) {
  const titleId = useId();
  const [draft, setDraft] = useState<DefineStylesPrefs>(() => ({
    version: 2,
    mode: prefs.mode,
    styles: cloneStyles(prefs.styles),
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

  const setMode = (mode: DefineStylesMode) => {
    setDraft((current) => ({ ...current, mode }));
  };

  const setFace = (id: DefineStyleId, face: StyleFace) => {
    setDraft((current) => ({
      ...current,
      styles: { ...current.styles, [id]: face },
    }));
  };

  const setPrimary = (face: StyleFace) => {
    setDraft((current) => ({
      ...current,
      styles: applyPrimaryFont(current.styles, face),
    }));
  };

  const factorySettings = () => {
    setDraft((current) => ({
      version: 2,
      mode: current.mode,
      styles: cloneStyles(FACTORY_DEFINE_STYLES),
    }));
  };

  const commitDraft = () => {
    onCommit(draft, useForNew);
  };

  const apply = () => commitDraft();
  const ok = () => {
    commitDraft();
    onClose();
  };

  const primary: StyleFace = {
    font: draft.styles.variable.font,
    bold: draft.styles.variable.bold,
    italic: draft.styles.variable.italic,
  };

  const rows =
    draft.mode === "simple"
      ? ([
          { id: "primary" as const, label: "Primary font", face: primary, onChange: setPrimary },
          {
            id: "text" as const,
            label: "Text",
            face: draft.styles.text,
            onChange: (face: StyleFace) => setFace("text", face),
          },
          {
            id: "textFe" as const,
            label: "Text (FE)",
            face: draft.styles.textFe,
            onChange: (face: StyleFace) => setFace("textFe", face),
          },
        ] as const)
      : DEFINE_STYLE_ORDER.map((row) => ({
          id: row.id,
          label: row.label,
          face: draft.styles[row.id],
          onChange: (face: StyleFace) => setFace(row.id, face),
        }));

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
        data-testid="define-styles-dialog"
        className="flex w-[34rem] max-w-full flex-col border border-[#6a6a6a] bg-[#f0f0f0] shadow-lg"
      >
        <h2
          id={titleId}
          className="border-b border-[#c0c0c0] bg-[#e8e8e8] px-3 py-1.5 text-[13px] font-semibold"
        >
          Define Styles
        </h2>

        <div className="flex gap-3 px-3 pt-3">
          {/* Left: Simple / Advanced + style grid */}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-4">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="define-styles-mode"
                  checked={draft.mode === "simple"}
                  onChange={() => setMode("simple")}
                />
                Simple
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="define-styles-mode"
                  checked={draft.mode === "advanced"}
                  onChange={() => setMode("advanced")}
                />
                Advanced
              </label>
            </div>

            <div className="border border-[#a0a0a0] bg-[#f7f7f7]">
              <div className="grid grid-cols-[7.25rem_minmax(0,1fr)_3.25rem_3.25rem] gap-x-1 border-b border-[#c8c8c8] bg-[#ebebeb] px-2 py-1 text-[11px] font-semibold text-[#333]">
                <div>Style</div>
                <div>Font</div>
                <div className="col-span-2 text-center">Character Style</div>
                <div />
                <div />
                <div className="text-center font-normal">Bold</div>
                <div className="text-center font-normal">Italic</div>
              </div>

              <div className="max-h-[min(28rem,58dvh)] overflow-y-auto px-2 py-1">
                {rows.map((row) => {
                  const fontId = `ds-font-${row.id}`;
                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-[7.25rem_minmax(0,1fr)_3.25rem_3.25rem] items-center gap-x-1 py-0.5"
                    >
                      <div className="truncate pr-1 text-[12px]" title={row.label}>
                        {row.label}
                      </div>
                      <FontCombo
                        id={fontId}
                        value={row.face.font}
                        onChange={(font) => row.onChange({ ...row.face, font })}
                      />
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={row.face.bold}
                          aria-label={`${row.label} Bold`}
                          onChange={(event) =>
                            row.onChange({ ...row.face, bold: event.target.checked })
                          }
                        />
                      </div>
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={row.face.italic}
                          aria-label={`${row.label} Italic`}
                          onChange={(event) =>
                            row.onChange({ ...row.face, italic: event.target.checked })
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: action buttons (MathType layout) */}
          <div className="flex w-[7.25rem] shrink-0 flex-col gap-1.5 pt-6">
            <button
              type="button"
              className="h-[26px] border border-[#6a6a6a] bg-[#e8e8e8] text-[12px] font-semibold hover:bg-white"
              onClick={ok}
            >
              OK
            </button>
            <button
              type="button"
              className="h-[26px] border border-[#9a9a9a] bg-[#f7f7f7] text-[12px] hover:bg-white"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="mt-2 h-[26px] border border-[#9a9a9a] bg-[#f7f7f7] text-[12px] hover:bg-white"
              onClick={apply}
            >
              Apply
            </button>
            <button
              type="button"
              className="mt-3 h-[26px] border border-[#9a9a9a] bg-[#f7f7f7] px-1 text-[11px] leading-tight hover:bg-white"
              onClick={factorySettings}
            >
              Factory settings
            </button>
            <label className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-[#333]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={useForNew}
                onChange={(event) => setUseForNew(event.target.checked)}
              />
              <span>Use for new equations</span>
            </label>
          </div>
        </div>

        <div className="px-3 pb-3 pt-2 text-[10px] leading-snug text-[#666]">
          Text / Text (FE) 預設非斜體；Variable／L.C. Greek／U.C. Greek 預設斜體；Vector-Matrix
          預設粗體。設定寫入 localStorage，並同步至工具列、畫布與匯出。
        </div>
      </div>
    </div>
  );
}
