import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props { images: string[]; name: string; startIndex?: number; }

/**
 * Full-screen gallery carousel for college campus photos.
 * Large hero image up top with left/right nav; horizontally scrollable
 * thumbnail strip below for quick jumping.
 */
export function GalleryCarousel({ images, name, startIndex = 0 }: Props) {
  const [index, setIndex] = useState(Math.min(Math.max(0, startIndex), Math.max(0, images.length - 1)));

  const stripRef = useRef<HTMLDivElement>(null);

  const go = (delta: number) => setIndex((i) => (i + delta + images.length) % images.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-thumb="${index}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index]);

  if (!images.length) return null;

  return (
    <div className="flex flex-col gap-3 px-5 pb-5">
      <div className="relative bg-black/90 rounded-2xl overflow-hidden aspect-[16/10] sm:aspect-[16/9] flex items-center justify-center">
        <img
          key={index}
          src={images[index]}
          alt={`${name} gallery ${index + 1}`}
          className="max-h-full max-w-full object-contain animate-fade-in"
          loading="eager"
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground rounded-full p-2 shadow-md transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground rounded-full p-2 shadow-md transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/80 text-foreground text-xs font-medium px-3 py-1 rounded-full shadow">
              {index + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div ref={stripRef} className="flex gap-2 overflow-x-auto pb-1 scroll-smooth snap-x">
          {images.map((img, i) => (
            <button
              key={i}
              data-thumb={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative shrink-0 snap-start rounded-lg overflow-hidden border-2 transition ${i === index ? "border-primary ring-2 ring-primary/30" : "border-transparent opacity-70 hover:opacity-100"}`}
              aria-label={`Open photo ${i + 1}`}
            >
              <img src={img} alt="" loading="lazy" className="h-16 w-24 sm:h-20 sm:w-28 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
