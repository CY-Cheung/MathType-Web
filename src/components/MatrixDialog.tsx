import { useEffect, useId, useState } from "react";
import { MATRIX_DIALOG_SHORTCUT } from "../core/shortcuts";
import {
  createMatrixSpec,
  cycleLine,
  withMatrixSize,
  type ColumnAlign,
  type MatrixFence,
  type MatrixSpec,
  type RowAlign,
} from "../core/matrixTemplate";
import { MatrixDividerGrid } from "./MatrixDividerGrid";
import { Choices, CountField } from "./MatrixDialogControls";

type MatrixDialogProps = {
  onCancel: () => void;
  onConfirm: (spec: MatrixSpec) => void;
};

const COLUMNS: { id: ColumnAlign; label: string }[] = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

const ROWS: { id: RowAlign; label: string }[] = [
  { id: "top", label: "Top" },
  { id: "baseline", label: "Baseline" },
  { id: "bottom", label: "Bottom" },
];

const FENCES: { id: MatrixFence; label: string }[] = [
  { id: "none", label: "None" },
  { id: "paren", label: "( )" },
  { id: "parenLeft", label: "( ." },
  { id: "parenRight", label: ". )" },
  { id: "bracket", label: "[ ]" },
  { id: "bracketLeft", label: "[ ." },
  { id: "bracketRight", label: ". ]" },
  { id: "brace", label: "{ }" },
  { id: "braceLeft", label: "{ ." },
  { id: "braceRight", label: ". }" },
  { id: "bar", label: "| |" },
];

export function MatrixDialog({ onCancel, onConfirm }: MatrixDialogProps) {
  const titleId = useId();
  const [spec, setSpec] = useState(createMatrixSpec);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  const setLines = (key: "verticalLines" | "horizontalLines", index: number) => {
    setSpec((current) => ({
      ...current,
      [key]: current[key].map((style, line) => (line === index ? cycleLine(style) : style)),
    }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-3 font-sans text-[13px] text-[#1a1a1a]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="matrix-dialog"
        className="flex max-h-[90dvh] w-[30rem] max-w-full flex-col overflow-hidden border border-[#8d8d8d] bg-[#f3f3f3] shadow-lg"
      >
        <h2
          id={titleId}
          className="shrink-0 border-b border-[#c6c6c6] bg-[#e6e6e6] px-3 py-1.5 text-[13px] font-semibold"
        >
          Matrix
        </h2>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm(spec);
          }}
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
              <CountField
                label="Rows"
                value={spec.rows}
                autoFocus
                onChange={(rows) =>
                  setSpec((current) => withMatrixSize(current, rows, current.columns))
                }
              />
              <CountField
                label="Columns"
                value={spec.columns}
                onChange={(columns) =>
                  setSpec((current) => withMatrixSize(current, current.rows, columns))
                }
              />
            </div>

            {/* <640px: native select; sm+: radio Choices */}
            <label className="flex flex-col gap-1 sm:hidden">
              <span className="font-semibold">Horizontal</span>
              <select
                className="box-border h-8 w-full border border-[#8a8a8a] bg-white px-1"
                value={spec.columnAlign}
                onChange={(event) =>
                  setSpec((current) => ({
                    ...current,
                    columnAlign: event.target.value as ColumnAlign,
                  }))
                }
              >
                {COLUMNS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="hidden sm:block">
              <Choices
                legend="Horizontal"
                name="matrix-column-align"
                value={spec.columnAlign}
                options={COLUMNS}
                onChange={(columnAlign) => setSpec((current) => ({ ...current, columnAlign }))}
              />
            </div>

            <label className="flex flex-col gap-1 sm:hidden">
              <span className="font-semibold">Vertical</span>
              <select
                className="box-border h-8 w-full border border-[#8a8a8a] bg-white px-1"
                value={spec.rowAlign}
                onChange={(event) =>
                  setSpec((current) => ({
                    ...current,
                    rowAlign: event.target.value as RowAlign,
                  }))
                }
              >
                {ROWS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="hidden sm:block">
              <Choices
                legend="Vertical"
                name="matrix-row-align"
                value={spec.rowAlign}
                options={ROWS}
                onChange={(rowAlign) => setSpec((current) => ({ ...current, rowAlign }))}
              />
            </div>

            <fieldset className="border border-[#c6c6c6] p-2">
              <legend className="px-1">Dividers</legend>
              <MatrixDividerGrid
                spec={spec}
                onVertical={(index) => setLines("verticalLines", index)}
                onHorizontal={(index) => setLines("horizontalLines", index)}
              />
              <p className="mt-1 text-[12px] text-[#333]">
                Click a divider to cycle Solid line, Dashed line, and None.
              </p>
            </fieldset>

            <label className="flex flex-col gap-1 sm:hidden">
              <span className="font-semibold">Fences</span>
              <select
                className="box-border h-8 w-full border border-[#8a8a8a] bg-white px-1"
                value={spec.fence}
                onChange={(event) =>
                  setSpec((current) => ({
                    ...current,
                    fence: event.target.value as MatrixFence,
                  }))
                }
              >
                {FENCES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="hidden sm:block">
              <Choices
                legend="Fences"
                name="matrix-fence"
                value={spec.fence}
                options={FENCES}
                onChange={(fence) => setSpec((current) => ({ ...current, fence }))}
              />
            </div>
            <p className="-mt-1 text-[11px] text-[#555]">
              Options ending in <code className="rounded-sm bg-[#ececec] px-0.5">.</code> are
              single-sided (left-only / right-only) — useful for piecewise / systems.
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-[#c6c6c6] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] text-[#333]">Shortcut: {MATRIX_DIALOG_SHORTCUT}</p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                className="h-8 border border-[#8a8a8a] bg-white px-3 hover:bg-[#f7f7f7] sm:h-7"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="matrix-ok"
                className="h-8 border border-[#6f6f6f] bg-[#ececec] px-3 font-semibold hover:bg-white sm:h-7"
              >
                OK
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
