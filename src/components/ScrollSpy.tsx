import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface ScrollSection {
  id: string;
  label: string;
}

interface ScrollSpyProps {
  sections: ScrollSection[];
  className?: string;
  baseUrl?: string;
  updateUrlOnScroll?: boolean;
}

export function ScrollSpy({ sections, className, baseUrl, updateUrlOnScroll = false }: ScrollSpyProps) {
  const { tab } = useParams<{ tab?: string }>();
  const initialTab = tab || sections[0]?.id || "";
  const [activeId, setActiveId] = useState(initialTab);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const isUserClick = useRef(false);
  const lastUserScrollAt = useRef(0);

  const updateUrl = useCallback((id: string) => {
    if (!baseUrl || !id) return;
    const target = `${baseUrl}/${id}`;
    if (window.location.pathname !== target) {
      window.history.replaceState(null, "", target);
    }
  }, [baseUrl]);

  useEffect(() => {
    setActiveId(tab || sections[0]?.id || "");
  }, [tab, sections]);

  // Scroll to the initial tab route ONCE on mount, with header-safe offset.
  // Cancel if the user starts scrolling before the timer fires, otherwise the
  // delayed programmatic scroll yanks the page back and feels like "scroll
  // jumps up" on detail pages.
  const didInitialScroll = useRef(false);
  useEffect(() => {
    if (didInitialScroll.current) return;
    didInitialScroll.current = true;
    const initial = tab;
    if (!initial) return;
    let cancelled = false;
    const cancel = () => { cancelled = true; };
    window.addEventListener("wheel", cancel, { passive: true, once: true });
    window.addEventListener("touchstart", cancel, { passive: true, once: true });
    window.addEventListener("keydown", cancel, { once: true });
    const timer = setTimeout(() => {
      if (cancelled) return;
      const el = document.getElementById(initial);
      if (el) {
        const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 150);
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("keydown", cancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const markUserScroll = () => {
      lastUserScrollAt.current = Date.now();
    };
    window.addEventListener("wheel", markUserScroll, { passive: true });
    window.addEventListener("touchmove", markUserScroll, { passive: true });
    window.addEventListener("keydown", markUserScroll);
    return () => {
      window.removeEventListener("wheel", markUserScroll);
      window.removeEventListener("touchmove", markUserScroll);
      window.removeEventListener("keydown", markUserScroll);
    };
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (isUserClick.current) return;
        const visible = sections
          .map(({ id }) => document.getElementById(id))
          .filter((el): el is HTMLElement => !!el)
          .map((el) => ({ id: el.id, top: el.getBoundingClientRect().top }))
          .filter((item) => item.top <= 180)
          .sort((a, b) => b.top - a.top);
        const newId = visible[0]?.id || entries.find((e) => e.isIntersecting)?.target.id;
        if (newId) {
          setActiveId(newId);
          // Keep scrollspy visual-only during passive scrolling. Updating the
          // browser path automatically made detail pages look like they were
          // refreshing themselves.
          if (updateUrlOnScroll) updateUrl(newId);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.05 }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [sections, updateUrl, updateUrlOnScroll]);

  const scrollTo = useCallback((id: string) => {
    isUserClick.current = true;
    setActiveId(id);
    
    // Only explicit user clicks update the URL.
    updateUrl(id);
    
    const el = document.getElementById(id);
    if (el) {
      const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 150);
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setTimeout(() => {
      isUserClick.current = false;
    }, 1200);
  }, [updateUrl]);

  // Auto-scroll active tab into view in nav bar
  useEffect(() => {
    if (!navRef.current) return;
    if (Date.now() - lastUserScrollAt.current < 250) return;
    const activeBtn = navRef.current.querySelector(`[data-id="${activeId}"]`);
    if (activeBtn) {
      const nav = navRef.current;
      const btn = activeBtn as HTMLElement;
      const nextLeft = btn.offsetLeft - nav.clientWidth / 2 + btn.clientWidth / 2;
      nav.scrollTo({ left: Math.max(0, nextLeft), behavior: "smooth" });
    }
  }, [activeId]);

  return (
    <div
      ref={navRef}
      className={cn(
        "sticky top-14 md:top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border",
        "flex overflow-x-auto scrollbar-hide gap-0.5 px-1 py-2",
        className
      )}
    >
      {sections.map(({ id, label }) => (
        <button
          key={id}
          data-id={id}
          onClick={() => scrollTo(id)}
          className={cn(
            "whitespace-nowrap px-4 py-2.5 rounded-lg text-sm md:text-base font-semibold transition-all shrink-0",
            activeId === id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
