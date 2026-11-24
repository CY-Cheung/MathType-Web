import { useEffect, useId } from "react";

type ShortcutsHelpDialogProps = {
  onClose: () => void;
};

const ROWS: { keys: string; action: string }[] = [
  { keys: "Ctrl+F", action: "Fraction" },
  { keys: "Ctrl+H", action: "Superscript" },
  { keys: "Ctrl+L", action: "Subscript" },
  { keys: "Ctrl+J", action: "Subscript + Superscript" },
  { keys: "Ctrl+R", action: "Square root" },
  { keys: "Ctrl+9", action: "Parentheses ( )" },
  { keys: "Ctrl+[", action: "Brackets [ ]" },
  { keys: "Ctrl+{", action: "Braces { }" },
  { keys: "Ctrl+I", action: "Integral" },
  { keys: "Ctrl+M", action: "Matrix dialog" },
  { keys: "Ctrl+G then letter", action: "Greek letter chord" },
  { keys: "Ctrl+K then key", action: "Symbol chord" },
  { keys: "Alt+T then key", action: "Template chord" },
  { keys: "Ctrl+Shift+C", action: "Copy as MathML" },
  { keys: "Ctrl+Shift+E", action: "Style → Text" },
  { keys: "Ctrl+Shift+M / =", action: "Style → Math" },
];

/** Desktop MathType 6.9b shortcut reference (Android IME uses OS shortcuts). */
export function ShortcutsHelpDialog({ onClose }: ShortcutsHelpDialogProps) {
  const titleId = useId();

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-3 font-sans text-[12px] text-[#1a1a1a]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="shortcuts-help-dialog"
        className="flex max-h-[90dvh] w-[28rem] max-w-full flex-col overflow-hidden border border-[#6a6a6a] bg-[#f0f0f0] shadow-lg"
      >
        <h2
          id={titleId}
          className="shrink-0 border-b border-[#c0c0c0] bg-[#e8e8e8] px-3 py-1.5 text-[13px] font-semibold"
        >
          Keyboard Shortcuts
        </h2>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          <p className="mb-2 text-[11px] text-[#555]">
            Desktop only — MathType 6.9b–style bindings. On Android the OS IME
            owns the keyboard; use the toolbar instead.
          </p>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#c8c8c8] text-[11px] font-semibold">
                <th className="py-1 pr-2">Shortcut</th>
                <th className="py-1">Action</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.keys} className="border-b border-[#ececec]">
                  <td className="py-1 pr-2 font-mono text-[11px]">{row.keys}</td>
                  <td className="py-1">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex shrink-0 justify-end border-t border-[#c8c8c8] px-3 py-2">
          <button
            type="button"
            className="h-[26px] border border-[#6a6a6a] bg-[#e8e8e8] px-3 text-[12px] font-semibold hover:bg-white"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
