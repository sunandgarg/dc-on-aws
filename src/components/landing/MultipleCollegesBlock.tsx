import { useState } from "react";
import { ChevronDown, ExternalLink, MapPin, IndianRupee } from "lucide-react";

export interface CollegeLite {
  name: string;
  logo?: string;
  city?: string;
  state?: string;
  fees?: string;
  rating?: string | number;
  highlights?: string[];
  link?: string;
  description?: string;
}

export type MultipleLayout = "compact" | "accordion" | "bento";

export function MultipleCollegesBlock({
  layout = "compact",
  colleges = [],
  title,
  subtitle,
}: {
  layout?: MultipleLayout;
  colleges: CollegeLite[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="px-5 md:px-12 py-10 md:py-14">
      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h2 className="text-3xl font-extrabold">{title}</h2>}
          {subtitle && <p className="opacity-70 mt-1">{subtitle}</p>}
        </div>
      )}
      {layout === "compact" && <CompactGrid colleges={colleges} />}
      {layout === "accordion" && <AccordionList colleges={colleges} />}
      {layout === "bento" && <BentoGrid colleges={colleges} />}
    </section>
  );
}

function CompactGrid({ colleges }: { colleges: CollegeLite[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {colleges.map((c, i) => (
        <a
          key={i}
          href={c.link || "#apply-card"}
          target={c.link?.startsWith("http") ? "_blank" : undefined}
          rel="noreferrer"
          className="lp-card p-5 flex gap-4 items-start hover:-translate-y-0.5 transition"
        >
          {c.logo ? (
            <img src={c.logo} alt={c.name} className="w-14 h-14 rounded-lg object-contain bg-white border" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-[var(--lp-accent)] flex items-center justify-center font-bold text-[var(--lp-primary)]">
              {c.name.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-bold leading-snug truncate">{c.name}</h3>
            <div className="text-xs opacity-70 flex flex-wrap gap-x-3 gap-y-1 mt-1">
              {(c.city || c.state) && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[c.city, c.state].filter(Boolean).join(", ")}</span>
              )}
              {c.fees && <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{c.fees}</span>}
            </div>
            <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--lp-primary)]">
              View details <ExternalLink className="w-3 h-3" />
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function AccordionList({ colleges }: { colleges: CollegeLite[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-3 max-w-4xl">
      {colleges.map((c, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="lp-card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center gap-3 p-4 text-left"
              aria-expanded={isOpen}
            >
              {c.logo ? (
                <img src={c.logo} alt="" className="w-10 h-10 rounded-md object-contain bg-white border" />
              ) : (
                <div className="w-10 h-10 rounded-md bg-[var(--lp-accent)] flex items-center justify-center text-xs font-bold text-[var(--lp-primary)]">{c.name.slice(0, 2)}</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold leading-tight truncate">{c.name}</div>
                <div className="text-xs opacity-70 truncate">
                  {[c.city, c.state, c.fees].filter(Boolean).join(" · ")}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 transition ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-0 text-sm space-y-3 border-t">
                {c.description && <p className="opacity-85 leading-relaxed">{c.description}</p>}
                {!!c.highlights?.length && (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {c.highlights.map((h, hi) => (
                      <li key={hi} className="flex gap-2 text-xs opacity-85"><span className="text-[var(--lp-primary)]">•</span>{h}</li>
                    ))}
                  </ul>
                )}
                {c.link && (
                  <a
                    href={c.link}
                    target={c.link.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--lp-primary)] hover:underline"
                  >
                    Open full details <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BentoGrid({ colleges }: { colleges: CollegeLite[] }) {
  // GenZ 2026 vibe: image-led tiles with vibrant accent corners, varied spans
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {colleges.map((c, i) => {
        const big = i % 5 === 0;
        return (
          <a
            key={i}
            href={c.link || "#apply-card"}
            target={c.link?.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            className={`group relative overflow-hidden rounded-2xl border bg-white hover:-translate-y-1 transition shadow-sm hover:shadow-xl ${big ? "col-span-2 row-span-2" : ""}`}
            style={{ minHeight: big ? 240 : 160 }}
          >
            {c.logo ? (
              <img src={c.logo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--lp-accent)] to-white" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wide bg-white/95 text-[var(--lp-primary)] px-2 py-1 rounded-full">
              {c.fees || "View"}
            </div>
            <div className="absolute bottom-3 left-3 right-3 text-white">
              <div className="font-extrabold leading-tight text-sm md:text-base line-clamp-2">{c.name}</div>
              {(c.city || c.state) && (
                <div className="text-[11px] opacity-90 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{[c.city, c.state].filter(Boolean).join(", ")}</div>
              )}
            </div>
          </a>
        );
      })}
    </div>
  );
}
