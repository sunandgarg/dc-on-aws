import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Plus, Loader2 } from "lucide-react";

interface Props {
  value: string[]; // uuid[]
  onChange: (next: string[]) => void;
  label?: string;
}

interface Row {
  id: string;
  name: string;
  code: string;
  semester_num: number;
  program_slug: string;
  university_slug: string;
}

export function CollegeSubjectMultiSearch({ value, onChange, label }: Props) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});

  // Resolve labels for already-selected ids
  useEffect(() => {
    const missing = value.filter((id) => id && !labels[id]);
    if (!missing.length) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("college_subjects")
        .select("id, name, code, semester_num, program_slug")
        .in("id", missing);
      const next = { ...labels };
      (data || []).forEach((r: any) => {
        next[r.id] = `${r.name}${r.code ? ` (${r.code})` : ""} · Sem ${r.semester_num} · ${r.program_slug}`;
      });
      setLabels(next);
    })();
  }, [value]); // eslint-disable-line

  useEffect(() => {
    const term = q.trim();
    if (!term) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await (supabase as any)
        .from("college_subjects")
        .select("id, name, code, semester_num, program_slug, university_slug")
        .or(`name.ilike.%${term}%,code.ilike.%${term}%`)
        .limit(20);
      setRows((data as Row[]) || []);
      setLoading(false);
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  const toggle = (r: Row) => {
    if (value.includes(r.id)) {
      onChange(value.filter((id) => id !== r.id));
    } else {
      onChange([...value, r.id]);
      setLabels((l) => ({
        ...l,
        [r.id]: `${r.name}${r.code ? ` (${r.code})` : ""} · Sem ${r.semester_num} · ${r.program_slug}`,
      }));
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
      {label && <label className="text-xs font-semibold text-foreground block">{label}</label>}
      <p className="text-[11px] text-muted-foreground leading-snug">
        Search semester-wise college subjects by name or code (e.g. "Data Structures" or "CS201"). Linked subjects appear as clickable cards on the public page so students can jump straight to notes &amp; PYQs.
      </p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search college subjects by name or code (e.g. Data Structures, CS201)…"
          className="pl-9 pr-9 h-9 text-sm"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
      </div>
      {q.trim() && (
        <div className="rounded-lg border border-border bg-card divide-y divide-border max-h-60 overflow-y-auto">
          {!loading && rows.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground text-center">
              No subjects match "<span className="font-medium text-foreground">{q}</span>".
            </div>
          )}
          {rows.map((r) => {
            const picked = value.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => toggle(r)}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-muted ${picked ? "bg-primary/5" : ""}`}
              >
                <span className="truncate">
                  <span className="font-medium text-foreground">{r.name}</span>
                  {r.code && <span className="text-muted-foreground ml-1.5">({r.code})</span>}
                  <span className="text-muted-foreground ml-1.5">· Sem {r.semester_num} · {r.program_slug}</span>
                </span>
                {picked ? <Badge variant="default" className="h-5 text-[10px]">Linked</Badge> : <Plus className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
            );
          })}
        </div>
      )}
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {value.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1 pr-1">
              <span className="truncate max-w-[220px]">{labels[id] || id}</span>
              <button type="button" onClick={() => onChange(value.filter((v) => v !== id))} className="hover:bg-muted rounded p-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        !q.trim() && <p className="text-[11px] text-muted-foreground italic">No subjects linked yet - start typing above to search.</p>
      )}
    </div>
  );
}
