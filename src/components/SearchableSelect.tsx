import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X } from "lucide-react";

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export function SearchableSelect({ options, value, onChange, placeholder, className = "" }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      // also ignore clicks inside the portal dropdown
      const portal = document.getElementById("searchable-select-portal-active");
      if (portal?.contains(t)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !btnRef.current) return;
    const update = () => {
      const r = btnRef.current!.getBoundingClientRect();
      setRect({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{value || placeholder}</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </button>

      {isOpen && rect && createPortal(
        <div
          id="searchable-select-portal-active"
          style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 9999, pointerEvents: "auto" }}
          className="bg-card border border-border rounded-xl shadow-xl overflow-hidden"
        >
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-7 py-1.5 text-sm bg-muted/50 rounded-lg border-0 focus:outline-none text-foreground placeholder:text-muted-foreground"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
          <div
            className="max-h-64 overflow-y-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setIsOpen(false); setSearch(""); }}
                className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                Clear selection
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground text-center">No results</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setIsOpen(false); setSearch(""); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${opt === value ? "bg-primary/5 text-primary font-medium" : "text-foreground"}`}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
