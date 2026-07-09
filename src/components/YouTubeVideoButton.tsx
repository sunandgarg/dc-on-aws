import { useState, useEffect } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useSiteIntegration } from "@/hooks/useSiteIntegration";

interface Props {
  url?: string;
  title?: string;
  label?: string;
  className?: string;
  /** Category-specific fallback (uses youtube_fallback_<category> integration). */
  category?: "college" | "course" | "exam" | "career";
  /** Override the integration key used for the fallback (e.g. "how_to_apply_exam"). */
  fallbackKey?: string;
}

function getYouTubeId(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

/**
 * YouTubeVideoButton - opens a video in a popup. Resolution order:
 * 1. Per-entity URL (passed via props)
 * 2. fallbackKey integration (youtube_fallback_<fallbackKey>) if provided
 * 3. Category-specific fallback (youtube_fallback_college/course/exam/career)
 * 4. Global default (youtube_default_url)
 */
export function YouTubeVideoButton({ url, title = "Watch Video", label = "Watch Video", className, category, fallbackKey }: Props) {
  const [open, setOpen] = useState(false);
  const { data: globalDefault } = useSiteIntegration("youtube_default_url");
  const { data: categoryFallback } = useSiteIntegration(category ? `youtube_fallback_${category}` : "youtube_default_url");
  const { data: keyFallback } = useSiteIntegration(fallbackKey ? `youtube_fallback_${fallbackKey}` : "youtube_default_url");
  const effectiveUrl = url || keyFallback || categoryFallback || globalDefault || "";
  const videoId = getYouTubeId(effectiveUrl);

  // Safety: clear any lingering body scroll/pointer-events lock after the dialog closes
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      if (document.body.style.pointerEvents === "none") document.body.style.pointerEvents = "";
      if (document.body.style.overflow === "hidden" && !document.querySelector('[role="dialog"][data-state="open"]')) {
        document.body.style.overflow = "";
      }
    }, 350);
    return () => clearTimeout(t);
  }, [open]);

  const btnCls = `gap-2 border-red-500/40 bg-red-500/5 text-red-600 hover:bg-red-500/10 hover:text-red-700 ${className ?? ""}`;
  const inner = (
    <>
      <span className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center">
        <Play className="w-3 h-3 fill-white text-white ml-0.5" />
      </span>
      {label}
    </>
  );

  if (!videoId) {
    if (!effectiveUrl) return null;
    return (
      <Button onClick={() => window.open(effectiveUrl, "_blank", "noopener,noreferrer")} variant="outline" className={btnCls}>{inner}</Button>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className={btnCls}>{inner}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-0">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">Embedded YouTube video player</DialogDescription>
          <div className="aspect-video w-full">
            {open && (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
