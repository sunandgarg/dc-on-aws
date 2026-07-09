import { useEffect, useRef, useState } from "react";
import { Plus, X, Upload, Images, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ArrayFieldEditorProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  /** Enable image upload + library picker buttons (uploads to admin-uploads bucket). */
  imageUpload?: boolean | { bucket?: string; folder?: string };
}

export function ArrayFieldEditor({ label, values, onChange, placeholder, suggestions, imageUpload }: ArrayFieldEditorProps) {
  const [input, setInput] = useState("");
  const imgCfg = typeof imageUpload === "object" ? imageUpload : {};
  const bucket = imgCfg.bucket || "admin-uploads";
  const folder = imgCfg.folder || "images";
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [libItems, setLibItems] = useState<{ name: string; url: string }[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [libQuery, setLibQuery] = useState("");

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} > 5MB, skipped`); continue; }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
        if (error) { toast.error(error.message); continue; }
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
        uploaded.push(pub.publicUrl);
      }
      if (uploaded.length) {
        onChange([...values, ...uploaded.filter((u) => !values.includes(u))]);
        toast.success(`Uploaded ${uploaded.length} image${uploaded.length > 1 ? "s" : ""}`);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const loadLibrary = async () => {
    setLibLoading(true);
    try {
      const { data, error } = await supabase.storage.from(bucket).list(folder, {
        limit: 200, sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw error;
      const items = (data || [])
        .filter((f) => !f.name.startsWith("."))
        .map((f) => {
          const path = `${folder}/${f.name}`;
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
          return { name: f.name, url: pub.publicUrl };
        });
      setLibItems(items);
    } catch (e: any) {
      toast.error(e.message || "Failed to load library");
    } finally {
      setLibLoading(false);
    }
  };

  useEffect(() => { if (libOpen && imageUpload) loadLibrary(); }, [libOpen]);

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  };

  const remove = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  const addSuggestion = (s: string) => {
    if (!values.includes(s)) onChange([...values, s]);
  };

  const unusedSuggestions = suggestions?.filter((s) => !values.includes(s)) ?? [];

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder || `Add ${label.toLowerCase()}...`}
          className="rounded-lg h-9 text-sm flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} className="h-9 px-3">
          <Plus className="w-3.5 h-3.5" />
        </Button>
        {imageUpload && (
          <>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="h-9 px-3 gap-1" title="Upload images">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setLibOpen((o) => !o)} className="h-9 px-3" title="Pick from library">
              <Images className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>
      {imageUpload && libOpen && (
        <div className="border border-border rounded-xl p-2 bg-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <Input value={libQuery} onChange={(e) => setLibQuery(e.target.value)} placeholder="Search library..." className="rounded-lg h-8 text-xs flex-1" />
            <Button type="button" size="sm" variant="ghost" onClick={() => setLibOpen(false)} className="h-8 px-2">Close</Button>
          </div>
          {libLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-xs"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...</div>
          ) : (() => {
            const filtered = libQuery ? libItems.filter((i) => i.name.toLowerCase().includes(libQuery.toLowerCase())) : libItems;
            if (!filtered.length) return <div className="text-xs text-muted-foreground text-center py-6">No images yet - upload some first.</div>;
            return (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-56 overflow-y-auto">
                {filtered.map((it) => {
                  const selected = values.includes(it.url);
                  return (
                    <button
                      key={it.name}
                      type="button"
                      onClick={() => {
                        if (selected) onChange(values.filter((v) => v !== it.url));
                        else onChange([...values, it.url]);
                      }}
                      className={`relative aspect-square rounded-md overflow-hidden border ${selected ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50"}`}
                      title={it.name}
                    >
                      <img src={it.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-w-full">
          {values.map((v, i) => {
            const isUrl = /^https?:\/\//i.test(v) || v.startsWith("data:");
            return (
              <Badge
                key={`${v}-${i}`}
                variant="secondary"
                // Cap chip width so long URLs / data URIs truncate with `…`
                // instead of stretching the form. Hover reveals full value.
                className="gap-1 pl-2.5 pr-1 py-1 max-w-full inline-flex items-center"
                title={v}
              >
                {isUrl ? (
                  <a
                    href={v}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate max-w-[260px] sm:max-w-[420px] md:max-w-[560px] hover:underline"
                  >
                    {v}
                  </a>
                ) : (
                  <span className="truncate max-w-[260px] sm:max-w-[420px] md:max-w-[560px]">{v}</span>
                )}
                <button type="button" onClick={() => remove(i)} className="ml-0.5 hover:bg-destructive/20 rounded-full p-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
      {unusedSuggestions.length > 0 && (
        (() => {
          // Live-filter suggestions by what the admin is typing - converts the
          // chip strip into an actual searchable picker once there are 8+ options.
          const q = input.trim().toLowerCase();
          const filtered = q
            ? unusedSuggestions.filter((s) => s.toLowerCase().includes(q))
            : unusedSuggestions;
          if (filtered.length === 0) return null;
          const cap = q ? 30 : 12;
          return (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
                {q ? `Matching suggestions (${filtered.length})` : "Quick add"}
              </p>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {filtered.slice(0, cap).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSuggestion(s)}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-background border border-border text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
