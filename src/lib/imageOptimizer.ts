/**
 * Client-side image optimizer.
 *
 * - Converts any raster image (jpg/png/heic-ish/bmp/etc.) to WebP when the
 *   browser supports the WebP encoder via <canvas>.toBlob (all modern
 *   browsers do).
 * - Down-scales so the longest edge fits within `maxDim` (default 1920).
 * - Targets ~`quality` (0..1) WebP quality.
 * - Returns the optimized File. If anything fails (unsupported type, decode
 *   error), the original File is returned unchanged - never throws.
 *
 * Non-image files (SVG, GIF animated, PDF, etc.) are passed through
 * unchanged because there's no benefit to canvas re-encoding them.
 */
export async function optimizeImageFile(
  file: File,
  opts: { maxDim?: number; quality?: number } = {}
): Promise<File> {
  const { maxDim = 1920, quality = 0.82 } = opts;
  try {
    if (!file || !file.type.startsWith("image/")) return file;
    // Skip SVG and animated GIFs - re-encoding them would be lossy or break animation.
    if (file.type === "image/svg+xml" || file.type === "image/gif") return file;

    const bitmap = await loadBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap as any, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", quality)
    );
    if (!blob) return file;
    // If the "optimized" version is somehow larger, keep the original.
    if (blob.size >= file.size && file.type === "image/webp") return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to <img> decode */
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Best-effort: fetch a remote image, optimize it to WebP, and return a File.
 * Returns null if the URL can't be fetched (CORS, 404, non-image, etc.) so
 * callers can keep the original URL.
 */
export async function optimizeRemoteImage(
  url: string,
  opts?: { maxDim?: number; quality?: number }
): Promise<File | null> {
  try {
    if (!url || !/^https?:\/\//i.test(url)) return null;
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    const name = (url.split("/").pop() || "remote").split("?")[0] || "remote";
    const file = new File([blob], name, { type: blob.type });
    return await optimizeImageFile(file, opts);
  } catch {
    return null;
  }
}
