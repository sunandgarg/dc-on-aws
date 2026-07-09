import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { toast } from "sonner";

export interface CompareCollege {
  slug: string;
  name: string;
  short_name?: string;
  image?: string;
  city?: string;
  state?: string;
}

interface Ctx {
  items: CompareCollege[];
  has: (slug: string) => boolean;
  toggle: (c: CompareCollege) => void;
  remove: (slug: string) => void;
  clear: () => void;
  max: number;
}

const CompareCtx = createContext<Ctx | null>(null);
const KEY = "dc_compare_v1";
const MAX = 4;

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareCollege[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const has = useCallback((slug: string) => items.some((i) => i.slug === slug), [items]);

  const toggle = useCallback(
    (c: CompareCollege) => {
      setItems((prev) => {
        if (prev.some((i) => i.slug === c.slug)) return prev.filter((i) => i.slug !== c.slug);
        if (prev.length >= MAX) {
          toast.error(`You can compare up to ${MAX} colleges at a time`);
          return prev;
        }
        const next = [...prev, c];
        if (next.length === 1) {
          toast.success(`${c.short_name || c.name} added - pick another to compare`, {
            action: { label: "Find another", onClick: () => { window.location.href = "/compare"; } },
          });
        } else {
          toast.success(`${c.short_name || c.name} added to compare`, {
            action: { label: "Compare now", onClick: () => { window.location.href = "/compare"; } },
          });
        }
        return next;
      });
    },
    [],
  );

  const remove = useCallback((slug: string) => setItems((prev) => prev.filter((i) => i.slug !== slug)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<Ctx>(() => ({ items, has, toggle, remove, clear, max: MAX }), [items, has, toggle, remove, clear]);
  return <CompareCtx.Provider value={value}>{children}</CompareCtx.Provider>;
}

export function useCompare() {
  const ctx = useContext(CompareCtx);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
