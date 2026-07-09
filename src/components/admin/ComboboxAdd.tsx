import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComboboxAddProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  /** Allow free-text values that aren't in `options`. Default true. */
  allowCustom?: boolean;
  className?: string;
}

/**
 * Searchable single-select with built-in "add custom value".
 * Used in admin forms where a curated list (e.g. Designation, Department,
 * Qualification) should be the default, but admins can also type their own.
 */
export function ComboboxAdd({
  value,
  onChange,
  options,
  placeholder = "Search or type to add…",
  allowCustom = true,
  className,
}: ComboboxAddProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

  const exists = options.some((o) => o.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-left flex items-center justify-between gap-2"
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>{value || placeholder}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered.length > 0) {
                    onChange(filtered[0]);
                    setQuery("");
                    setOpen(false);
                  } else if (allowCustom && query.trim()) {
                    onChange(query.trim());
                    setQuery("");
                    setOpen(false);
                  }
                }
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Type to search…"
              className="w-full h-9 px-3 text-sm bg-transparent border-b border-border outline-none"
            />
            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => {
                    onChange(o);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2"
                >
                  {value === o ? <Check className="w-3.5 h-3.5 text-primary" /> : <span className="w-3.5" />}
                  <span className="truncate">{o}</span>
                </button>
              ))}
              {allowCustom && query.trim() && !exists && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(query.trim());
                    setQuery("");
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2 text-primary border-t border-border"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="truncate">Add "{query.trim()}"</span>
                </button>
              )}
              {filtered.length === 0 && !allowCustom && (
                <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
