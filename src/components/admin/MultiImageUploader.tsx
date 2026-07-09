import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { optimizeImageFile } from "@/lib/imageOptimizer";
import { ImageQualityControls, useImageQuality } from "@/components/admin/ImageQualityControls";

interface Props {
  label?: string;
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  bucket?: string;
  hint?: string;
  /** Optional parallel array of names (e.g. AICTE, UGC). When provided, a name input is shown for each logo. */
  names?: string[];
  onNamesChange?: (names: string[]) => void;
  namePlaceholder?: string;
}

export function MultiImageUploader({ label, value, onChange, folder = "images", bucket = "admin-uploads", hint, names, onNamesChange, namePlaceholder = "Name (e.g. AICTE)" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { quality, setQuality } = useImageQuality();
  const list = value || [];
  const nameList = names || [];
  const supportsNames = !!onNamesChange;

  const setName = (i: number, v: string) => {
    if (!onNamesChange) return;
    const next = [...nameList];
    while (next.length <= i) next.push("");
    next[i] = v;
    onNamesChange(next);
  };

  const removeAt = (i: number) => {
    onChange(list.filter((_, idx) => idx !== i));
    if (onNamesChange) onNamesChange(nameList.filter((_, idx) => idx !== i));
  };

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    const next: string[] = [...list];
    const nextNames: string[] = [...nameList];
    try {
      for (const raw of Array.from(files)) {
        const file = quality.hd ? raw : await optimizeImageFile(raw, { maxDim: quality.maxDim });
        if (file.size > 8 * 1024 * 1024) { toast.error(`${file.name} > 8MB skipped`); continue; }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
        if (error) { toast.error(error.message); continue; }
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
        next.push(pub.publicUrl);
        nextNames.push("");
      }
      onChange(next);
      if (onNamesChange) onNamesChange(nextNames);
      toast.success(quality.hd ? "Uploaded (HD original)" : "Uploaded (WebP)");
    } finally { setUploading(false); }
  };

  return (
    <div>
      {label && <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>}
      <ImageQualityControls value={quality} onChange={setQuality} className="mb-1.5" />
      <div className={supportsNames ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-2" : "flex flex-wrap gap-2 mb-2"}>
        {list.map((u, i) => (
          <div key={i} className="relative group bg-muted/30 rounded-lg border border-border p-2">
            <img src={u} alt={nameList[i] || ""} className="h-14 w-full object-contain" />
            <button type="button" onClick={() => removeAt(i)} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <X className="w-3 h-3" />
            </button>
            {supportsNames && (
              <Input
                value={nameList[i] || ""}
                onChange={(e) => setName(i, e.target.value)}
                placeholder={namePlaceholder}
                className="h-7 text-[11px] mt-1.5"
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-lg gap-1 h-8">
          <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading..." : "Upload images"}
        </Button>
        <div className="flex gap-1 items-center">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="or paste URL" className="h-8 text-xs w-52" />
          <Button type="button" size="sm" variant="outline" onClick={() => { if (url.trim()) { onChange([...list, url.trim()]); if (onNamesChange) onNamesChange([...nameList, ""]); setUrl(""); } }} className="h-8 px-2"><Plus className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
