import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

export type FloatingAlign = "start" | "end";

type FloatingPortalProps = {
  open: boolean;
  /** Trigger / anchor element used for getBoundingClientRect(). */
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  id?: string;
  role?: string;
  /** Prefer aligning panel start to anchor left, or end to anchor right. */
  align?: FloatingAlign;
  gap?: number;
  zIndex?: number;
  /**
   * Extra elements that count as "inside" for outside-click (usually the
   * trigger). The portaled panel is always included via panelRef.
   */
  insideRefs?: ReadonlyArray<RefObject<HTMLElement | null>>;
};

type Coords = { top: number; left: number };

const VIEW_PAD = 4;
const EMPTY_INSIDE_REFS: ReadonlyArray<RefObject<HTMLElement | null>> = [];

/**
 * Position a fixed panel below (or above) an anchor, clamped to the viewport.
 * Prefer `align`; if that side would overflow horizontally, flip to the other.
 */
export function computeFloatingCoords(
  anchor: DOMRect,
  panelWidth: number,
  panelHeight: number,
  align: FloatingAlign,
  gap: number,
): Coords {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = anchor.bottom + gap;
  if (top + panelHeight > vh - VIEW_PAD) {
    const above = anchor.top - gap - panelHeight;
    top = above >= VIEW_PAD ? above : Math.max(VIEW_PAD, vh - VIEW_PAD - panelHeight);
  }

  const startLeft = anchor.left;
  const endLeft = anchor.right - panelWidth;
  let left = align === "end" ? endLeft : startLeft;

  // Prefer the requested align; if it overflows, flip.
  if (align === "start" && left + panelWidth > vw - VIEW_PAD) {
    left = endLeft;
  } else if (align === "end" && left < VIEW_PAD) {
    left = startLeft;
  }

  // Final clamp so the panel stays on-screen on very narrow viewports.
  left = Math.min(Math.max(left, VIEW_PAD), Math.max(VIEW_PAD, vw - VIEW_PAD - panelWidth));

  return { top, left };
}

/**
 * Renders `children` into `document.body` with `position: fixed`, anchored to
 * a trigger. Escapes parent `overflow-x-auto` clipping (which forces overflow-y
 * clipping too). Closes on Escape, outside pointer, scroll, and resize.
 */
export function FloatingPortal({
  open,
  anchorRef,
  onClose,
  children,
  className,
  id,
  role,
  align = "start",
  gap = 1,
  zIndex = 60,
  insideRefs = EMPTY_INSIDE_REFS,
}: FloatingPortalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const a = anchor.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const width = p.width || panel.offsetWidth || 200;
    const height = p.height || panel.offsetHeight || 120;
    setCoords(computeFloatingCoords(a, width, height, align, gap));
  }, [align, anchorRef, gap]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
    // Second pass after fonts / grid paint settle panel size.
    const id = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(id);
  }, [open, updatePosition, children]);

  useEffect(() => {
    if (!open) return;

    const close = () => onCloseRef.current();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    };

    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      for (const ref of insideRefs) {
        if (ref.current?.contains(target)) return;
      }
      close();
    };

    // Scroll (incl. toolbar overflow-x) or resize → dismiss so the panel
    // never floats at a stale coordinate.
    const onScrollOrResize = () => close();

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, anchorRef, insideRefs]);

  if (!open || typeof document === "undefined") return null;

  const style: CSSProperties = {
    position: "fixed",
    top: coords?.top ?? -9999,
    left: coords?.left ?? -9999,
    zIndex,
    visibility: coords ? "visible" : "hidden",
  };

  return createPortal(
    <div ref={panelRef} id={id} role={role} className={className} style={style}>
      {children}
    </div>,
    document.body,
  );
}
