import { useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export interface FilterGroupConfig {
  title: string;
  items: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  singleSelect?: boolean;
}

/**
 * KollegeApply-style filter group: collapsible accordion with inline search,
 * selected chips on top, "+ N more" reveal, and consistent compact styling.
 * Used in BOTH desktop sidebar and mobile bottom-sheet so behavior is identical.
 */
export function FilterAccordionGroup({ title, items, selected, onChange, singleSelect, defaultOpen = true, initialVisible = 6 }: FilterGroupConfig & { defaultOpen?: boolean; initialVisible?: number }) {
  const [open, setOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState("");
  const list = q ? items.filter((i) => i.toLowerCase().includes(q.toLowerCase())) : items;
  const visible = showAll || q ? list : list.slice(0, initialVisible);

  const toggle = (item: string) => {
    if (singleSelect) onChange(selected.includes(item) ? [] : [item]);
    else onChange(selected.includes(item) ? selected.filter((x) => x !== item) : [...selected, item]);
  };

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center w-full py-3 text-sm font-semibold text-foreground"
        aria-expanded={open}
      >
        <span className="flex-1 text-left">{title}</span>
        {selected.length > 0 && (
          <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-[10px] px-1.5 mr-2 h-5">{selected.length}</Badge>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="pb-3 space-y-2">
          {items.length > 8 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}`}
                className="h-8 pl-8 text-xs rounded-lg"
              />
            </div>
          )}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggle(s)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/15"
                >
                  {s} <X className="w-2.5 h-2.5" />
                </button>
              ))}
            </div>
          )}
          <div className="space-y-1.5">
            {visible.map((item) => {
              const checked = selected.includes(item);
              return (
                <label
                  key={item}
                  className={`flex items-center gap-2 px-1 py-1 rounded-md cursor-pointer text-xs transition-colors ${
                    checked ? "text-primary font-medium" : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(item)} className="w-4 h-4" />
                  <span className="truncate">{item}</span>
                </label>
              );
            })}
            {visible.length === 0 && (
              <p className="text-[11px] text-muted-foreground italic">No matches</p>
            )}
          </div>
          {!q && list.length > initialVisible && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-primary font-medium hover:underline"
            >
              {showAll ? "Show less" : `+ ${list.length - initialVisible} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
