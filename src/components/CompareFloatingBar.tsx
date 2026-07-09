import { Link, useLocation } from "react-router-dom";
import { X, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "@/contexts/CompareContext";

export function CompareFloatingBar() {
  const { items, remove, clear } = useCompare();
  const { pathname } = useLocation();
  if (!items.length || pathname.startsWith("/admin") || pathname === "/compare") return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[min(96vw,720px)]">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-2 pl-4 flex items-center gap-2">
        <GitCompareArrows className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {items.map((c) => (
            <span
              key={c.slug}
              className="inline-flex items-center gap-1 bg-muted text-xs px-2 py-1 rounded-full whitespace-nowrap"
            >
              {c.short_name || c.name}
              <button onClick={() => remove(c.slug)} aria-label={`Remove ${c.name}`} className="text-muted-foreground hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={clear} className="h-8 px-2 text-xs">Clear</Button>
        <Link to="/compare">
          <Button size="sm" className="rounded-xl h-8 px-3" disabled={items.length < 2}>
            Compare ({items.length})
          </Button>
        </Link>
      </div>
    </div>
  );
}
