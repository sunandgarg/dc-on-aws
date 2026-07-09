import { useEffect, useRef, useState, ReactNode, Suspense } from "react";

interface Props {
  children: ReactNode;
  rootMargin?: string;
  minHeight?: number;
  /** Mount after this many ms even if never scrolled into view (default 4000ms). Set 0 to disable. */
  fallbackDelay?: number;
}

/**
 * Renders a lightweight placeholder until the wrapper scrolls near the viewport,
 * then mounts the heavy children. Drastically reduces initial JS/render cost.
 */
export function DeferUntilVisible({ children, rootMargin = "300px", minHeight = 120, fallbackDelay = 4000 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    let t: any;
    if (fallbackDelay > 0) {
      t = setTimeout(() => setVisible(true), fallbackDelay);
    }
    return () => {
      io.disconnect();
      if (t) clearTimeout(t);
    };
  }, [visible, rootMargin, fallbackDelay]);

  return (
    <div ref={ref} style={!visible ? { minHeight } : undefined}>
      {visible ? <Suspense fallback={null}>{children}</Suspense> : null}
    </div>
  );
}
