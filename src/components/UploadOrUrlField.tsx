import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X, FileText, ImageIcon, ExternalLink, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageHint, type ImagePresetKey } from "@/components/ImageHint";
import { optimizeImageFile, optimizeRemoteImage } from "@/lib/imageOptimizer";
import { ImageQualityControls, useImageQuality } from "@/components/admin/ImageQualityControls";

interface UploadOrUrlFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** "image" enables an image preview; "file" shows a generic file pill (PDF/etc.) */
  kind?: "image" | "file";
  /** Folder name inside the admin-uploads bucket */
  folder?: string;
  /** Image preset for the recommended-size hint (only when kind="image") */
  preset?: ImagePresetKey;
  /** Accept attribute, e.g. "image/*" or "application/pdf" */
  accept?: string;
  /** Max size in MB. Defaults: image=2MB, file=10MB */
  maxSizeMb?: number;
  placeholder?: string;
}

export function UploadOrUrlField({
  label,
  value,
  onChange,
  kind = "image",
  folder = "misc",
  preset,
  accept,
  maxSizeMb,
  placeholder = "Paste URL or upload",
}: UploadOrUrlFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { quality, setQuality } = useImageQuality();
  const acceptAttr = accept ?? (kind === "image" ? "image/*" : "application/pdf,application/msword,.doc,.docx");
  const maxBytes = (maxSizeMb ?? (kind === "image" ? 2 : 10)) * 1024 * 1024;

  const handleFile = async (rawFile: File) => {
    setUploading(true);
    try {
      // Auto-convert images to optimized WebP unless HD (keep original) is on
      const file =
        kind === "image" && !quality.hd
          ? await optimizeImageFile(rawFile, { maxDim: quality.maxDim })
          : rawFile;
      if (file.size > maxBytes) {
        toast.error(`File too large. Max ${maxSizeMb ?? (kind === "image" ? 2 : 10)}MB`);
        setUploading(false);
        return;
      }
      const ext = file.name.split(".").pop() || "bin";
      const safeBase = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 40);
      const path = `${folder}/${Date.now()}-${safeBase}.${ext}`;
      const { error } = await supabase.storage.from("admin-uploads").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("admin-uploads").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success(kind === "image" ? (quality.hd ? "Uploaded (HD original)" : "Uploaded (optimized to WebP)") : "Uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  /**
   * "Optimize URL" - fetches the remote image, re-encodes to WebP and
   * re-uploads to our bucket. Best-effort: if CORS blocks fetch, we leave
   * the original URL untouched and tell the admin.
   */
  const optimizeUrl = async () => {
    if (!value || kind !== "image") return;
    if (value.includes("/storage/v1/object/public/admin-uploads/") && value.endsWith(".webp")) {
      toast.info("Already optimized");
      return;
    }
    setUploading(true);
    try {
      const optimized = await optimizeRemoteImage(value);
      if (!optimized) {
        toast.error("Couldn't fetch this URL (likely blocked by CORS). Keeping original.");
        return;
      }
      const path = `${folder}/${Date.now()}-url-optimized.webp`;
      const { error } = await supabase.storage.from("admin-uploads").upload(path, optimized, {
        cacheControl: "3600",
        contentType: "image/webp",
      });
      if (error) throw error;
      const { data } = supabase.storage.from("admin-uploads").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("URL optimized to WebP");
    } catch (err: any) {
      toast.error(err?.message || "Optimize failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {kind === "image" && (
        <ImageQualityControls value={quality} onChange={setQuality} className="mb-1 mt-0.5" />
      )}
      <div className="flex gap-2">
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="rounded-lg h-9 text-sm flex-1"
        />
        {kind === "image" && value && /^https?:\/\//i.test(value) && !value.includes("/storage/v1/object/public/admin-uploads/") && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={optimizeUrl}
            disabled={uploading}
            className="h-9 px-3 gap-1.5 shrink-0"
            title="Fetch URL → convert to WebP → re-upload to our storage"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Optimize URL</span>
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-9 px-3 gap-1.5 shrink-0"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{uploading ? "Working" : "Upload"}</span>
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {/* Preview */}
      {value && (
        <div className="mt-1.5 flex items-center gap-2 min-w-0">
          {kind === "image" ? (
            <img
              src={value}
              alt={label}
              className="w-12 h-12 rounded-md object-cover border border-border shrink-0"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs min-w-0 max-w-full">
              <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">{value.split("/").pop()}</span>
            </div>
          )}
          {/* Truncated clickable URL - fills available width, shows full link in tooltip & opens in new tab */}
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            title={value}
            className="text-[11px] text-primary hover:underline truncate min-w-0 flex-1"
          >
            {value}
          </a>
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[11px] text-destructive hover:underline flex items-center gap-1 shrink-0"
            title="Clear"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        </div>
      )}

      {kind === "image" && preset && <ImageHint preset={preset} />}
    </div>
  );
}

/** YouTube link field with live thumbnail preview */
export function YouTubeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const idMatch = value?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  const id = idMatch?.[1];
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://youtube.com/watch?v=..."
        className="rounded-lg h-9 text-sm"
      />
      {id && (
        <div className="mt-1.5 flex items-center gap-2">
          <img
            src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`}
            alt="YouTube thumbnail"
            className="w-20 h-12 rounded-md object-cover border border-border"
          />
          <a
            href={`https://www.youtube.com/watch?v=${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline flex items-center gap-1"
          >
            Preview <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}

/** Multi-file uploader: stores an array of {label, url} entries (e.g. previous year question papers) */
export function MultiFileField({
  label,
  values,
  onChange,
  folder = "misc",
  accept = "application/pdf",
  maxSizeMb = 15,
  itemLabelPlaceholder = "Year e.g. 2024",
}: {
  label: string;
  values: { label: string; url: string }[];
  onChange: (v: { label: string; url: string }[]) => void;
  folder?: string;
  accept?: string;
  maxSizeMb?: number;
  itemLabelPlaceholder?: string;
}) {
  const [itemLabel, setItemLabel] = useState("");
  const [itemUrl, setItemUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const safe = Array.isArray(values) ? values : [];

  const addEntry = (url: string) => {
    if (!itemLabel.trim() || !url.trim()) {
      toast.error("Add a label and a file/URL");
      return;
    }
    onChange([...safe, { label: itemLabel.trim(), url: url.trim() }]);
    setItemLabel("");
    setItemUrl("");
  };

  const handleFile = async (rawFile: File) => {
    if (!itemLabel.trim()) {
      toast.error("Enter a label first (e.g. 2024)");
      return;
    }
    setUploading(true);
    try {
      const file = rawFile.type.startsWith("image/") ? await optimizeImageFile(rawFile) : rawFile;
      if (file.size > maxSizeMb * 1024 * 1024) {
        toast.error(`File too large. Max ${maxSizeMb}MB`);
        setUploading(false);
        return;
      }
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${folder}/${Date.now()}-${itemLabel.replace(/[^a-zA-Z0-9-_]/g, "-")}.${ext}`;
      const { error } = await supabase.storage.from("admin-uploads").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || undefined,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("admin-uploads").getPublicUrl(path);
      addEntry(data.publicUrl);
      toast.success("Uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={itemLabel}
          onChange={(e) => setItemLabel(e.target.value)}
          placeholder={itemLabelPlaceholder}
          className="rounded-lg h-9 text-sm sm:w-32"
        />
        <Input
          value={itemUrl}
          onChange={(e) => setItemUrl(e.target.value)}
          placeholder="Paste URL or upload →"
          className="rounded-lg h-9 text-sm flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={() => addEntry(itemUrl)} className="h-9 px-3">
          <ImageIcon className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-9 px-3"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          <span className="ml-1">{uploading ? "Uploading" : "Upload"}</span>
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>
      {safe.length > 0 && (
        <div className="space-y-1">
          {safe.map((it, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted rounded-lg px-2 py-1.5">
              <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs font-medium text-foreground shrink-0">{it.label}</span>
              <a
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-primary hover:underline truncate flex-1"
              >
                {it.url.split("/").pop()}
              </a>
              <button
                type="button"
                onClick={() => onChange(safe.filter((_, j) => j !== i))}
                className="text-destructive hover:bg-destructive/10 rounded p-1 shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
