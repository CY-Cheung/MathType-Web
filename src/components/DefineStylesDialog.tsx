import { useEffect, useId, useState } from "react";
import {
  applyPrimaryFont,
  cloneStyles,
  COMMON_FONT_PRESETS,
  CUSTOM_FONT_OPTION,
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

/**
 * Native `<select>` so Android opens the OS picker on tap (no soft keyboard).
 * Preset list + Custom… prompt for free-form faces.
 */
function FontSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (font: string) => void;
}) {
  const known = (COMMON_FONT_PRESETS as readonly string[]).includes(value);
  // Keep the free-form face selected by its real name; Custom… only triggers a prompt.
  const selectValue = known || value ? value : COMMON_FONT_PRESETS[0];

  return (
    <select
      id={id}
      className="box-border h-[22px] w-full min-w-[7.5rem] border border-[#7a7a7a] bg-white px-0.5 text-[12px] leading-none"
      value={selectValue}
      onChange={(event) => {
        const next = event.target.value;
        if (next === CUSTOM_FONT_OPTION) {
          const custom = window.prompt("Font name:", value || "Times New Roman");
          if (custom == null) return;
          const trimmed = custom.trim();
          if (trimmed) onChange(trimmed);
          return;
        }
        onChange(next);
      }}
    >
      {!known && value ? <option value={value}>{value}</option> : null}
      {COMMON_FONT_PRESETS.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
      <option value={CUSTOM_FONT_OPTION}>Custom…</option>
    </select>
  );
}

function ActionButtons({
  useForNew,
  onUseForNew,
  onOk,
  onCancel,
  onApply,
  onFactory,
}: {
  useForNew: boolean;
  onUseForNew: (value: boolean) => void;
  onOk: () => void;
  onCancel: () => void;
  onApply: () => void;
  onFactory: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="h-[26px] border border-[#6a6a6a] bg-[#e8e8e8] text-[12px] font-semibold hover:bg-white"
        onClick={onOk}
      >
        OK
      </button>
      <button
        type="button"
        className="h-[26px] border border-[#9a9a9a] bg-[#f7f7f7] text-[12px] hover:bg-white"
        onClick={onCancel}
      >
        Cancel
      </button>
      <button
        type="button"
        className="mt-0 h-[26px] border border-[#9a9a9a] bg-[#f7f7f7] text-[12px] hover:bg-white sm:mt-2"
        onClick={onApply}
      >
        Apply
      </button>
      <button
        type="button"
        className="mt-0 h-[26px] border border-[#9a9a9a] bg-[#f7f7f7] px-1 text-[11px] leading-tight hover:bg-white sm:mt-3"
        onClick={onFactory}
      >
        Factory settings
      </button>
      <label className="mt-0 flex items-start gap-1.5 text-[11px] leading-snug text-[#333] sm:mt-3">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={useForNew}
          onChange={(event) => onUseForNew(event.target.checked)}
        />
        <span>Use for new equations</span>
      </label>
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

  const actionProps = {
    useForNew,
    onUseForNew: setUseForNew,
    onOk: ok,
    onCancel: onClose,
    onApply: apply,
    onFactory: factorySettings,
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
        data-testid="define-styles-dialog"
        className="flex max-h-[90dvh] w-[34rem] max-w-full flex-col overflow-hidden border border-[#6a6a6a] bg-[#f0f0f0] shadow-lg"
      >
        <h2
          id={titleId}
          className="shrink-0 border-b border-[#c0c0c0] bg-[#e8e8e8] px-3 py-1.5 text-[13px] font-semibold"
        >
          Define Styles
        </h2>

        {/* sm+: side-by-side; <640px: stack table above actions */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 pt-3 sm:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="mb-2 flex shrink-0 items-center gap-4">
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

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[#a0a0a0] bg-[#f7f7f7]">
              <div className="shrink-0 overflow-x-auto">
                <div className="grid min-w-[22rem] grid-cols-[6.5rem_minmax(7.5rem,1fr)_2.75rem_2.75rem] gap-x-1 border-b border-[#c8c8c8] bg-[#ebebeb] px-2 py-1 text-[11px] font-semibold text-[#333] sm:grid-cols-[7.25rem_minmax(0,1fr)_3.25rem_3.25rem]">
                  <div>Style</div>
                  <div>Font</div>
                  <div className="col-span-2 text-center">Character Style</div>
                  <div />
                  <div />
                  <div className="text-center font-normal">Bold</div>
                  <div className="text-center font-normal">Italic</div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto px-2 py-1">
                {rows.map((row) => {
                  const fontId = `ds-font-${row.id}`;
                  return (
                    <div
                      key={row.id}
                      className="grid min-w-[22rem] grid-cols-[6.5rem_minmax(7.5rem,1fr)_2.75rem_2.75rem] items-center gap-x-1 py-0.5 sm:grid-cols-[7.25rem_minmax(0,1fr)_3.25rem_3.25rem]"
                    >
                      <div className="min-w-[5.5rem] truncate pr-1 text-[12px]" title={row.label}>
                        {row.label}
                      </div>
                      <FontSelect
                        id={fontId}
                        value={row.face.font}
                        onChange={(font) => row.onChange({ ...row.face, font })}
                      />
                      <div className="flex min-w-[2.5rem] justify-center">
                        <input
                          type="checkbox"
                          checked={row.face.bold}
                          aria-label={`${row.label} Bold`}
                          onChange={(event) =>
                            row.onChange({ ...row.face, bold: event.target.checked })
                          }
                        />
                      </div>
                      <div className="flex min-w-[2.5rem] justify-center">
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

          {/* Desktop: right column. Mobile: full-width actions under the table. */}
          <div className="hidden w-[7.25rem] shrink-0 flex-col gap-1.5 pt-6 sm:flex">
            <ActionButtons {...actionProps} />
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-1.5 border-t border-[#c8c8c8] pt-2 sm:hidden">
            <ActionButtons {...actionProps} />
          </div>
        </div>

        <div className="shrink-0 px-3 pb-3 pt-2 text-[10px] leading-snug text-[#666]">
          Text / Text (FE) 預設非斜體；Variable／L.C. Greek／U.C. Greek 預設斜體；Vector-Matrix
          預設粗體。設定寫入 localStorage，並同步至工具列、畫布與匯出。
        </div>
      </div>
    </div>
  );
}
