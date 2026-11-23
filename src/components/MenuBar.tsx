import { useId, useRef, useState } from "react";
import {
  ACTIVE_STYLE_ORDER,
  type ActiveStyleId,
} from "../types/activeStyle";
import {
  isWorkspaceZoomPreset,
  WORKSPACE_ZOOM_PRESETS,
} from "../types/workspaceZoom";
import { FloatingPortal } from "./FloatingPortal";

export type MenuBarEditAction =
  | "undo"
  | "redo"
  | "cut"
  | "copy"
  | "paste"
  | "selectAll"
  | "clear";

type MenuBarProps = {
  activeStyle: ActiveStyleId;
  zoomPercent: number;
  plainImageNoLink: boolean;
  onActiveStyleChange: (id: ActiveStyleId) => void;
  onZoomChange: (percent: number) => void;
  onPlainImageNoLinkChange: () => void;
  onOpenDefineStyles: () => void;
  onEdit: (action: MenuBarEditAction) => void;
  onExportMathMl: () => void;
};

type MenuItem =
  | {
      kind: "action";
      id: string;
      label: string;
      shortcut?: string;
      checked?: boolean;
      disabled?: boolean;
      onSelect?: () => void;
    }
  | { kind: "separator"; id: string };

type MenuDef = {
  id: string;
  label: string;
  items: MenuItem[];
};

function keepFocus(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

function MenuDropdown({
  menu,
  open,
  menuDomId,
  onOpen,
  onClose,
  anyOpen,
}: {
  menu: MenuDef;
  open: boolean;
  menuDomId: string;
  onOpen: () => void;
  onClose: () => void;
  anyOpen: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuDomId}
        className={`h-full px-2.5 leading-none hover:bg-[#dce8f8] ${
          open ? "bg-[#dce8f8]" : ""
        }`}
        onMouseDown={keepFocus}
        onClick={() => (open ? onClose() : onOpen())}
        onMouseEnter={() => {
          if (anyOpen) onOpen();
        }}
      >
        {menu.label}
      </button>
      <FloatingPortal
        open={open}
        anchorRef={triggerRef}
        onClose={onClose}
        id={menuDomId}
        role="menu"
        align="start"
        zIndex={70}
        className="min-w-[12.5rem] border border-[#7a7a7a] bg-[#f7f7f7] py-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
      >
        {menu.items.map((item) => {
          if (item.kind === "separator") {
            return (
              <div
                key={item.id}
                role="separator"
                className="my-0.5 border-t border-[#c0c0c0]"
              />
            );
          }
          const disabled = Boolean(item.disabled);
          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              aria-checked={item.checked}
              disabled={disabled}
              className={`flex w-full items-center justify-between gap-4 px-2.5 py-1 text-left text-[12px] ${
                disabled
                  ? "cursor-default text-[#9a9a9a]"
                  : "text-[#1a1a1a] hover:bg-[#dce8f8]"
              } ${item.checked && !disabled ? "font-semibold" : ""}`}
              onMouseDown={keepFocus}
              onClick={() => {
                if (disabled) return;
                item.onSelect?.();
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 text-center text-[10px]">
                  {item.checked ? "✓" : ""}
                </span>
                {item.label}
              </span>
              {item.shortcut ? (
                <span className="text-[10px] font-normal text-[#666]">
                  {item.shortcut}
                </span>
              ) : null}
            </button>
          );
        })}
      </FloatingPortal>
    </div>
  );
}

/**
 * MathType 6.9b–style top menu bar (File / Edit / View / …).
 * Dropdowns portal to document.body so overflow-x-auto on the bar cannot clip them.
 */
export function MenuBar({
  activeStyle,
  zoomPercent,
  plainImageNoLink,
  onActiveStyleChange,
  onZoomChange,
  onPlainImageNoLinkChange,
  onOpenDefineStyles,
  onEdit,
  onExportMathMl,
}: MenuBarProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const baseId = useId();

  const close = () => setOpenId(null);

  const run = (fn?: () => void) => {
    close();
    fn?.();
  };

  const promptCustomZoom = () => {
    const raw = window.prompt("Zoom percent (50–800):", String(zoomPercent));
    if (raw == null) return;
    const parsed = Number(String(raw).replace(/%/g, "").trim());
    if (!Number.isFinite(parsed)) return;
    onZoomChange(parsed);
  };

  const menus: MenuDef[] = [
    {
      id: "file",
      label: "File",
      items: [
        { kind: "action", id: "new", label: "New", disabled: true },
        { kind: "action", id: "open", label: "Open…", disabled: true },
        { kind: "action", id: "close", label: "Close", disabled: true },
        { kind: "separator", id: "file-sep-1" },
        { kind: "action", id: "save", label: "Save", disabled: true },
        { kind: "action", id: "save-as", label: "Save As…", disabled: true },
        { kind: "separator", id: "file-sep-2" },
        {
          kind: "action",
          id: "copy-export",
          label: "Copy as MathML",
          shortcut: "Ctrl+Shift+C",
          onSelect: () => run(onExportMathMl),
        },
        { kind: "separator", id: "file-sep-3" },
        { kind: "action", id: "exit", label: "Exit", disabled: true },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        {
          kind: "action",
          id: "undo",
          label: "Undo",
          shortcut: "Ctrl+Z",
          onSelect: () => run(() => onEdit("undo")),
        },
        {
          kind: "action",
          id: "redo",
          label: "Redo",
          shortcut: "Ctrl+Y",
          onSelect: () => run(() => onEdit("redo")),
        },
        { kind: "separator", id: "edit-sep-1" },
        {
          kind: "action",
          id: "cut",
          label: "Cut",
          shortcut: "Ctrl+X",
          onSelect: () => run(() => onEdit("cut")),
        },
        {
          kind: "action",
          id: "copy",
          label: "Copy",
          shortcut: "Ctrl+C",
          onSelect: () => run(() => onEdit("copy")),
        },
        {
          kind: "action",
          id: "paste",
          label: "Paste",
          shortcut: "Ctrl+V",
          onSelect: () => run(() => onEdit("paste")),
        },
        { kind: "separator", id: "edit-sep-2" },
        {
          kind: "action",
          id: "select-all",
          label: "Select All",
          shortcut: "Ctrl+A",
          onSelect: () => run(() => onEdit("selectAll")),
        },
        {
          kind: "action",
          id: "clear",
          label: "Clear",
          onSelect: () => run(() => onEdit("clear")),
        },
      ],
    },
    {
      id: "view",
      label: "View",
      items: [
        ...WORKSPACE_ZOOM_PRESETS.map(
          (percent): MenuItem => ({
            kind: "action",
            id: `zoom-${percent}`,
            label: `${percent}%`,
            checked: zoomPercent === percent,
            onSelect: () => run(() => onZoomChange(percent)),
          }),
        ),
        { kind: "separator", id: "view-sep-1" },
        {
          kind: "action",
          id: "zoom-custom",
          label: "Custom…",
          checked: !isWorkspaceZoomPreset(zoomPercent),
          onSelect: () => run(promptCustomZoom),
        },
        { kind: "separator", id: "view-sep-2" },
        { kind: "action", id: "ruler", label: "Ruler", disabled: true },
      ],
    },
    {
      id: "format",
      label: "Format",
      items: [
        { kind: "action", id: "color", label: "Color…", disabled: true },
        { kind: "action", id: "fence", label: "Fence Alignment…", disabled: true },
        { kind: "action", id: "spacing", label: "Spacing…", disabled: true },
      ],
    },
    {
      id: "style",
      label: "Style",
      items: [
        ...ACTIVE_STYLE_ORDER.map(
          (row): MenuItem => ({
            kind: "action",
            id: `style-${row.id}`,
            label: row.label,
            shortcut: row.shortcut,
            checked: row.id === activeStyle,
            onSelect: () => run(() => onActiveStyleChange(row.id)),
          }),
        ),
        { kind: "separator", id: "style-sep-1" },
        {
          kind: "action",
          id: "define-styles",
          label: "Define Styles…",
          onSelect: () => run(onOpenDefineStyles),
        },
      ],
    },
    {
      id: "size",
      label: "Size",
      items: [
        {
          kind: "action",
          id: "size-full",
          label: "Full",
          checked: true,
          onSelect: () => run(),
        },
        { kind: "action", id: "size-script", label: "Script", disabled: true },
        {
          kind: "action",
          id: "size-scriptscript",
          label: "Script Script",
          disabled: true,
        },
        { kind: "action", id: "size-symbol", label: "Symbol", disabled: true },
        {
          kind: "action",
          id: "size-subsymbol",
          label: "Smaller Symbol",
          disabled: true,
        },
        { kind: "action", id: "size-user1", label: "User 1", disabled: true },
        { kind: "action", id: "size-user2", label: "User 2", disabled: true },
        { kind: "separator", id: "size-sep-1" },
        { kind: "action", id: "size-other", label: "Other…", disabled: true },
        {
          kind: "action",
          id: "size-define",
          label: "Define Sizes…",
          disabled: true,
        },
      ],
    },
    {
      id: "preferences",
      label: "Preferences",
      items: [
        {
          kind: "action",
          id: "prefs-styles",
          label: "Define Styles…",
          onSelect: () => run(onOpenDefineStyles),
        },
        {
          kind: "action",
          id: "prefs-sizes",
          label: "Define Sizes…",
          disabled: true,
        },
        {
          kind: "action",
          id: "prefs-spacing",
          label: "Spacing…",
          disabled: true,
        },
        {
          kind: "action",
          id: "prefs-translators",
          label: "Translators…",
          disabled: true,
        },
        {
          kind: "action",
          id: "prefs-cut-copy",
          label: "Cut and Copy Preferences…",
          disabled: true,
        },
        {
          kind: "action",
          id: "prefs-plain-image",
          label: "Plain Image for Word (No Hyperlink)",
          checked: plainImageNoLink,
          onSelect: () => run(onPlainImageNoLinkChange),
        },
        {
          kind: "action",
          id: "prefs-workspace",
          label: "Workspace Preferences…",
          disabled: true,
        },
      ],
    },
    {
      id: "help",
      label: "Help",
      items: [
        { kind: "action", id: "help-contents", label: "Contents…", disabled: true },
        { kind: "action", id: "help-search", label: "Search…", disabled: true },
        { kind: "separator", id: "help-sep-1" },
        {
          kind: "action",
          id: "help-about",
          label: "About MathType Web…",
          disabled: true,
        },
      ],
    },
  ];

  return (
    <div
      data-testid="menubar"
      className="flex h-6 shrink-0 items-stretch overflow-x-auto border-b border-[#b5b5b5] bg-[#f3f3f3] px-0.5 font-sans text-[12px] text-[#1a1a1a]"
      role="menubar"
    >
      {menus.map((menu) => (
        <MenuDropdown
          key={menu.id}
          menu={menu}
          open={openId === menu.id}
          menuDomId={`${baseId}-${menu.id}`}
          anyOpen={openId != null}
          onOpen={() => setOpenId(menu.id)}
          onClose={close}
        />
      ))}
    </div>
  );
}
