import { useEffect, useState } from "react";

/**
 * Lock the app shell to the actual on-screen viewport height.
 * On Android Chrome the soft keyboard shrinks `visualViewport` while
 * `100dvh` / `window.innerHeight` can lag — syncing `--app-vvh` keeps the
 * MenuBar + toolbar visible and stops the window from scrolling away.
 */
export function useVisualViewportLock(): number {
  const [height, setHeight] = useState(() =>
    typeof window !== "undefined"
      ? Math.round(window.visualViewport?.height ?? window.innerHeight)
      : 0,
  );

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = root.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyHeight = body.style.height;
    const prevOverscroll = root.style.overscrollBehavior;

    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.height = "100%";
    root.style.overscrollBehavior = "none";

    const sync = () => {
      const vv = window.visualViewport;
      const next = Math.max(
        1,
        Math.round(vv?.height ?? window.innerHeight),
      );
      setHeight(next);
      root.style.setProperty("--app-vvh", `${next}px`);
    };

    sync();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      root.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.height = prevBodyHeight;
      root.style.overscrollBehavior = prevOverscroll;
      root.style.removeProperty("--app-vvh");
    };
  }, []);

  return height;
}
