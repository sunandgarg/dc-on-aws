import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookmarkPlus, Bookmark, Trash2, Check, Star } from "lucide-react";
import { toast } from "sonner";

export type LeadFiltersSnapshot = Record<string, any>;
export type LeadPreset = { id: string; name: string; filters: LeadFiltersSnapshot; createdAt: number };

const KEY = "admin_leads_presets_v1";

export function loadPresets(): LeadPreset[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function savePresets(list: LeadPreset[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* noop */ }
}

export function LeadFilterPresets({ current, onApply }: { current: LeadFiltersSnapshot; onApply: (f: LeadFiltersSnapshot) => void }) {
  const [presets, setPresets] = useState<LeadPreset[]>([]);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => { setPresets(loadPresets()); }, [open]);

  const save = () => {
    if (!name.trim()) { toast.error("Name this preset first"); return; }
    const next: LeadPreset[] = [{ id: crypto.randomUUID(), name: name.trim(), filters: current, createdAt: Date.now() }, ...presets].slice(0, 20);
    setPresets(next); savePresets(next); setName("");
    toast.success(`Saved “${next[0].name}”`);
  };
  const remove = (id: string) => {
    const next = presets.filter((p) => p.id !== id); setPresets(next); savePresets(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg">
          <Star className="w-3.5 h-3.5" /> Saved Views
          {presets.length > 0 && <span className="text-[10px] text-muted-foreground">({presets.length})</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-3 py-2 border-b border-border">
          <div className="text-xs font-semibold uppercase tracking-wide">Saved Filter Views</div>
          <div className="text-[10px] text-muted-foreground">Snapshot the current Advanced Filter combo</div>
        </div>
        <div className="p-2 flex gap-2 border-b border-border">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hot Delhi leads" className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && save()} />
          <Button size="sm" onClick={save} className="h-8 gap-1"><BookmarkPlus className="w-3.5 h-3.5" />Save</Button>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {presets.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">No saved views yet.</div>
          ) : presets.map((p) => (
            <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/60 rounded-md mx-1 group">
              <Bookmark className="w-3.5 h-3.5 text-primary shrink-0" />
              <button onClick={() => { onApply(p.filters); setOpen(false); toast.success(`Applied “${p.name}”`); }} className="flex-1 text-left text-sm truncate">{p.name}</button>
              <button onClick={() => remove(p.id)} className="opacity-0 group-hover:opacity-100 transition w-6 h-6 rounded hover:bg-destructive/10 flex items-center justify-center" title="Delete">
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
