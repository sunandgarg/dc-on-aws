import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Columns3, GripVertical, RotateCcw } from "lucide-react";

export type LeadColumnDef = {
  key: string;
  label: string;
  defaultVisible?: boolean;
};

type Props = {
  columns: LeadColumnDef[];
  order: string[];
  visible: Record<string, boolean>;
  onChange: (next: { order: string[]; visible: Record<string, boolean> }) => void;
  onReset: () => void;
};

/** Drag-to-reorder + checkbox show/hide popover for table columns. */
export function LeadsColumnCustomizer({ columns, order, visible, onChange, onReset }: Props) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  const ordered = order
    .map((k) => columns.find((c) => c.key === k))
    .filter(Boolean) as LeadColumnDef[];

  const visibleCount = ordered.filter((c) => visible[c.key] !== false).length;

  const handleDrop = (target: string) => {
    if (!dragKey || dragKey === target) return;
    const from = order.indexOf(dragKey);
    const to = order.indexOf(target);
    if (from < 0 || to < 0) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, dragKey);
    onChange({ order: next, visible });
    setDragKey(null);
    setOverKey(null);
  };

  const toggle = (k: string, v: boolean) => {
    onChange({ order, visible: { ...visible, [k]: v } });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Columns3 className="w-4 h-4" />
          Columns
          <span className="text-[10px] text-muted-foreground">({visibleCount}/{columns.length})</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide">Customize Columns</div>
            <div className="text-[10px] text-muted-foreground">Drag to reorder • Toggle to show/hide</div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={onReset}>
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {ordered.map((c) => {
            const isOver = overKey === c.key && dragKey !== c.key;
            return (
              <div
                key={c.key}
                draggable
                onDragStart={() => setDragKey(c.key)}
                onDragOver={(e) => { e.preventDefault(); setOverKey(c.key); }}
                onDragLeave={() => setOverKey(null)}
                onDrop={() => handleDrop(c.key)}
                onDragEnd={() => { setDragKey(null); setOverKey(null); }}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab active:cursor-grabbing select-none ${
                  isOver ? "bg-primary/10 border border-dashed border-primary/40" : "hover:bg-muted/60"
                } ${dragKey === c.key ? "opacity-40" : ""}`}
              >
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <Checkbox
                  checked={visible[c.key] !== false}
                  onCheckedChange={(v) => toggle(c.key, !!v)}
                />
                <span className="text-sm flex-1 truncate">{c.label}</span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
