import type { CSSProperties } from "react";
import type { LineStyle, MatrixSpec } from "../core/matrixTemplate";

type MatrixDividerGridProps = {
  spec: MatrixSpec;
  onVertical: (index: number) => void;
  onHorizontal: (index: number) => void;
};

const LINE_NAME: Record<LineStyle, string> = {
  none: "None",
  solid: "Solid line",
  dashed: "Dashed line",
};

function linePaint(style: LineStyle, orientation: "h" | "v"): CSSProperties {
  const across = orientation === "h";
  if (style === "dashed") {
    const image = across
      ? "repeating-linear-gradient(90deg, #111 0 5px, transparent 5px 8px)"
      : "repeating-linear-gradient(#111 0 4px, transparent 4px 7px)";
    return { backgroundImage: image };
  }
  return { background: style === "solid" ? "#111" : "#6d6d6d" };
}

function DividerButton({
  orientation,
  style,
  label,
  onClick,
  styleAttr,
}: {
  orientation: "h" | "v";
  style: LineStyle;
  label: string;
  onClick: () => void;
  styleAttr: CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={`${LINE_NAME[style]}. Click to cycle Solid line, Dashed line, and None.`}
      onClick={onClick}
      className="flex items-center justify-center p-0"
      style={styleAttr}
    >
      <span
        className={orientation === "v" ? "h-full w-0.5" : "h-0.5 w-full"}
        style={linePaint(style, orientation)}
      />
    </button>
  );
}

export function MatrixDividerGrid({ spec, onVertical, onHorizontal }: MatrixDividerGridProps) {
  const columns = Array.from({ length: spec.columns * 2 - 1 }, (_, index) => (index % 2 === 0 ? "32px" : "12px"));
  const rows = Array.from({ length: spec.rows * 2 - 1 }, (_, index) => (index % 2 === 0 ? "28px" : "12px"));
  return (
    <div
      className="inline-grid max-h-64 max-w-full overflow-auto bg-white p-2"
      data-testid="matrix-dividers"
      style={{ gridTemplateColumns: columns.join(" "), gridTemplateRows: rows.join(" ") }}
    >
      {Array.from({ length: spec.rows }, (_, row) =>
        Array.from({ length: spec.columns }, (_, column) => (
          <div
            key={`cell-${row}-${column}`}
            className="border border-[#c5c5c5] bg-[#fbfbfb]"
            style={{ gridColumn: column * 2 + 1, gridRow: row * 2 + 1 }}
          />
        )),
      )}
      {spec.verticalLines.map((style, column) =>
        Array.from({ length: spec.rows }, (_, row) => (
          <DividerButton
            key={`v-${column}-${row}`}
            orientation="v"
            style={style}
            label={`Column divider ${column + 1}, ${LINE_NAME[style]}`}
            onClick={() => onVertical(column)}
            styleAttr={{ gridColumn: column * 2 + 2, gridRow: row * 2 + 1 }}
          />
        )),
      )}
      {spec.horizontalLines.map((style, row) =>
        Array.from({ length: spec.columns }, (_, column) => (
          <DividerButton
            key={`h-${row}-${column}`}
            orientation="h"
            style={style}
            label={`Row divider ${row + 1}, ${LINE_NAME[style]}`}
            onClick={() => onHorizontal(row)}
            styleAttr={{ gridColumn: column * 2 + 1, gridRow: row * 2 + 2 }}
          />
        )),
      )}
      {spec.verticalLines.map((vertical, column) =>
        spec.horizontalLines.map((horizontal, row) => (
          <div
            key={`x-${column}-${row}`}
            className="relative"
            style={{ gridColumn: column * 2 + 2, gridRow: row * 2 + 2 }}
          >
            <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2" style={linePaint(vertical, "v")} />
            <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2" style={linePaint(horizontal, "h")} />
          </div>
        )),
      )}
    </div>
  );
}
