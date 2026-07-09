import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Global safety net for body scroll-lock leaks left behind by dialogs,
 * sheets, drawers, or popovers (Radix sometimes leaves
 * `pointer-events: none` / `overflow: hidden` on <body> after close).
 *
 * Runs on every route change, on a low-frequency interval, and on the
 * first user scroll attempt to clear stuck styles whenever no modal-like
 * element is actually open.
 */
export function ScrollLockGuard() {
  const { pathname } = useLocation();

  useEffect(() => {
    const cleanup = () => {
      const hasOpenModal = !!document.querySelector(
        '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"], [data-radix-popper-content-wrapper] [data-state="open"]'
      );
      if (hasOpenModal) return;
      const body = document.body;
      const html = document.documentElement;
      if (body.style.pointerEvents === "none") body.style.pointerEvents = "";
      if (body.style.overflow === "hidden") body.style.overflow = "";
      if (html.style.overflow === "hidden") html.style.overflow = "";
      if (body.hasAttribute("data-scroll-locked")) body.removeAttribute("data-scroll-locked");
      if (body.style.paddingRight) body.style.paddingRight = "";
      if (body.style.position === "fixed") {
        body.style.position = "";
        body.style.top = "";
        body.style.width = "";
      }
    };

    // Immediate cleanup on route change
    cleanup();
    const raf = requestAnimationFrame(cleanup);
    const id = window.setInterval(cleanup, 1000);
    const onUserScroll = () => cleanup();
    window.addEventListener("wheel", onUserScroll, { passive: true });
    window.addEventListener("touchstart", onUserScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
      window.removeEventListener("wheel", onUserScroll);
      window.removeEventListener("touchstart", onUserScroll);
    };
  }, [pathname]);

  return null;
}
