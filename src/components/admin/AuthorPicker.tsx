import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface Props {
  value?: string | null;
  onChange: (id: string | null) => void;
  label?: string;
}

/** Dropdown of all active authors. Used in admin entity forms. */
export function AuthorPicker({ value, onChange, label = "Author" }: Props) {
  const [authors, setAuthors] = useState<{ id: string; name: string; designation: string }[]>([]);
  useEffect(() => {
    (supabase as any).from("authors").select("id,name,designation").eq("is_active", true).order("display_order")
      .then(({ data }: any) => setAuthors(data || []));
  }, []);
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9"
      >
        <option value="">- Unassigned -</option>
        {authors.map((a) => (
          <option key={a.id} value={a.id}>{a.name}{a.designation ? ` · ${a.designation}` : ""}</option>
        ))}
      </select>
      <Link to="/admin/authors" className="text-[10px] text-primary hover:underline">+ Manage authors</Link>
    </div>
  );
}
