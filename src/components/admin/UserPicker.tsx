import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Search, Check } from "lucide-react";

interface Profile { user_id: string; display_name: string | null; email: string | null; phone: string | null; avatar_url?: string | null; }

interface Props {
  value?: string | null;
  onChange: (userId: string | null, profile?: Profile | null) => void;
  label?: string;
}

/** Searchable picker for linking an auth user (profile) to an entity (e.g. an Author). */
export function UserPicker({ value, onChange, label = "Linked User Account" }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const selected = profiles.find((p) => p.user_id === value);

  useEffect(() => {
    (supabase as any)
      .from("profiles")
      .select("user_id, display_name, email, phone, avatar_url")
      .order("display_name")
      .limit(500)
      .then(({ data }: any) => setProfiles(data || []));
  }, []);

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (p.display_name || "").toLowerCase().includes(q)
      || (p.email || "").toLowerCase().includes(q)
      || (p.phone || "").includes(q);
  }).slice(0, 50);

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {selected ? (
        <div className="flex items-center gap-2 p-2 rounded-lg border border-primary/40 bg-primary/5">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
            {(selected.display_name || selected.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{selected.display_name || "(no name)"}</p>
            <p className="text-xs text-muted-foreground truncate">{selected.email || selected.phone}</p>
          </div>
          <button type="button" onClick={() => onChange(null, null)} className="p-1 rounded hover:bg-destructive/10 text-destructive" title="Unlink">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="Search by name, email or phone…"
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>
          {open && (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-card divide-y divide-border">
              {filtered.map((p) => (
                <button
                  key={p.user_id}
                  type="button"
                  onClick={() => { onChange(p.user_id, p); setOpen(false); setSearch(""); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    {(p.display_name || p.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{p.display_name || "(no name)"}</p>
                    <p className="text-muted-foreground truncate">{p.email || p.phone}</p>
                  </div>
                  {value === p.user_id && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              ))}
              {filtered.length === 0 && <p className="text-xs text-muted-foreground p-3 text-center">No matches</p>}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">Optional. Linking lets that user manage their own author profile from their dashboard.</p>
        </>
      )}
    </div>
  );
}
