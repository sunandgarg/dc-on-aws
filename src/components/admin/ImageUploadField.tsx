import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Link as LinkIcon, X, Images, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ImageHint, type ImagePresetKey } from "@/components/ImageHint";
import { optimizeImageFile } from "@/lib/imageOptimizer";
import { ImageQualityControls, useImageQuality } from "@/components/admin/ImageQualityControls";

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  preset?: ImagePresetKey;
  bucket?: string;
  folder?: string;
}

/**
 * Combined upload-or-URL-or-library field. Admins can paste a URL,
 * upload a new file, or pick from previously uploaded images.
 */
export function ImageUploadField({ value, onChange, label, preset, bucket = "admin-uploads", folder = "images" }: Props) {
  const [mode, setMode] = useState<"url" | "upload" | "library">("url");
  const [uploading, setUploading] = useState(false);
  const { quality, setQuality } = useImageQuality();
  const fileRef = useRef<HTMLInputElement>(null);
  const [libItems, setLibItems] = useState<{ name: string; url: string }[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [libQuery, setLibQuery] = useState("");

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

  useEffect(() => { if (mode === "library") loadLibrary(); }, [mode]);

  const handleFile = async (rawFile: File) => {
    if (!rawFile) return;
    setUploading(true);
    try {
      const file = quality.hd ? rawFile : await optimizeImageFile(rawFile, { maxDim: quality.maxDim });
      if (file.size > 8 * 1024 * 1024) { toast.error("File must be under 8 MB"); setUploading(false); return; }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(pub.publicUrl);
      toast.success(quality.hd ? "Uploaded (HD original)" : "Uploaded (WebP)");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const filtered = libQuery
    ? libItems.filter((i) => i.name.toLowerCase().includes(libQuery.toLowerCase()))
    : libItems;

  return (
    <div>
      {label && <label className="text-xs text-muted-foreground mb-1 block">{label}</label>}
      <div className="flex flex-wrap gap-1 mb-1.5">
        <Button type="button" size="sm" variant={mode === "url" ? "default" : "outline"} onClick={() => setMode("url")} className="rounded-lg h-7 text-xs gap-1">
          <LinkIcon className="w-3 h-3" /> Link
        </Button>
        <Button type="button" size="sm" variant={mode === "upload" ? "default" : "outline"} onClick={() => setMode("upload")} className="rounded-lg h-7 text-xs gap-1">
          <Upload className="w-3 h-3" /> Upload
        </Button>
        <Button type="button" size="sm" variant={mode === "library" ? "default" : "outline"} onClick={() => setMode("library")} className="rounded-lg h-7 text-xs gap-1">
          <Images className="w-3 h-3" /> Library
        </Button>
      </div>
      {mode === "url" && (
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="https://..." className="rounded-xl" />
      )}
      {mode === "upload" && (
        <div>
          <ImageQualityControls value={quality} onChange={setQuality} className="mb-1.5" />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full rounded-xl gap-2">
            <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Click to browse / upload image"}
          </Button>
        </div>
      )}
      {mode === "library" && (
        <div className="border border-border rounded-xl p-2 bg-muted/20">
          <Input value={libQuery} onChange={(e) => setLibQuery(e.target.value)} placeholder="Search library..." className="rounded-lg h-8 mb-2 text-xs" />
          {libLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-6">No images in library yet - upload one first.</div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-56 overflow-y-auto">
              {filtered.map((it) => (
                <button
                  key={it.name}
                  type="button"
                  onClick={() => { onChange(it.url); toast.success("Selected"); }}
                  className={`relative aspect-square rounded-md overflow-hidden border ${value === it.url ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50"}`}
                  title={it.name}
                >
                  <img src={it.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {value && (
        <div className="mt-2 flex items-center gap-2 p-2 bg-muted/40 rounded-lg">
          <img src={value} alt="" className="w-10 h-10 rounded object-cover" />
          <span className="text-xs text-muted-foreground truncate flex-1">{value}</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")} className="h-6 w-6 p-0">
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}
      {preset && <ImageHint preset={preset} />}
    </div>
  );
}
