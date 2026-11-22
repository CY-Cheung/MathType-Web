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
  { id: "bracket", label: "[ ]" },
  { id: "brace", label: "{ }" },
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 font-sans text-[13px] text-[#1a1a1a]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="matrix-dialog"
        className="w-[30rem] max-w-full border border-[#8d8d8d] bg-[#f3f3f3] shadow-lg"
      >
        <h2 id={titleId} className="border-b border-[#c6c6c6] bg-[#e6e6e6] px-3 py-1.5 text-[13px] font-semibold">
          Matrix
        </h2>
        <form
          className="flex flex-col gap-3 px-3 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm(spec);
          }}
        >
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <CountField
              label="Rows"
              value={spec.rows}
              autoFocus
              onChange={(rows) => setSpec((current) => withMatrixSize(current, rows, current.columns))}
            />
            <CountField
              label="Columns"
              value={spec.columns}
              onChange={(columns) => setSpec((current) => withMatrixSize(current, current.rows, columns))}
            />
          </div>
          <Choices
            legend="Horizontal"
            name="matrix-column-align"
            value={spec.columnAlign}
            options={COLUMNS}
            onChange={(columnAlign) => setSpec((current) => ({ ...current, columnAlign }))}
          />
          <Choices
            legend="Vertical"
            name="matrix-row-align"
            value={spec.rowAlign}
            options={ROWS}
            onChange={(rowAlign) => setSpec((current) => ({ ...current, rowAlign }))}
          />
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
          <Choices
            legend="Fences"
            name="matrix-fence"
            value={spec.fence}
            options={FENCES}
            onChange={(fence) => setSpec((current) => ({ ...current, fence }))}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-[#333]">Shortcut: {MATRIX_DIALOG_SHORTCUT}</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="h-7 border border-[#8a8a8a] bg-white px-3 hover:bg-[#f7f7f7]"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="matrix-ok"
                className="h-7 border border-[#6f6f6f] bg-[#ececec] px-3 font-semibold hover:bg-white"
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
