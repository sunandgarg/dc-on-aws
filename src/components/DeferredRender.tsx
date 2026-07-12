import { type ReactNode, useEffect, useRef, useState } from "react";

export function DeferredRender({ children, minHeight = 600 }: { children: ReactNode; minHeight?: number }) {
  const marker = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    const element = marker.current;
    if (!element || !("IntersectionObserver" in window)) {
      const id = window.setTimeout(() => setReady(true), 1200);
      return () => window.clearTimeout(id);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setReady(true);
        observer.disconnect();
      }
    }, { rootMargin: "150px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ready]);

  return <div ref={marker} style={!ready ? { minHeight } : undefined}>{ready ? children : null}</div>;
}

