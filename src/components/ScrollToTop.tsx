import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to top on every route change, unless the URL contains a hash
 * (in which case the browser/anchor logic should handle it).
 */
export function ScrollToTop() {
  const { pathname, hash, search } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      // Wait two frames so lazy-loaded route content has mounted before we measure.
      const raf1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.getElementById(id);
          if (el) {
            const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 96);
            window.scrollTo({ top: y, behavior: "auto" });
          } else {
            window.scrollTo({ top: 0, behavior: "auto" });
          }
        });
      });
      return () => cancelAnimationFrame(raf1);
    }
    // Force scroll to top on route change, even if Suspense fallback delays content.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const t = setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }), 50);
    const t2 = setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }), 250);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [pathname, hash, search]);

  return null;
}
