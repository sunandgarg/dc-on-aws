import { Link } from "react-router-dom";
import { ArrowRight, Compass } from "lucide-react";
import { useHeroCategories } from "@/hooks/useHeroCategories";

export function GlobalDiscoveryBar() {
  const { data: categories } = useHeroCategories();

  return (
    <section className="border-y border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 py-8 text-slate-950" aria-labelledby="global-discovery-title">
      <div className="container">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <span className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.15em] text-primary">
              <Compass className="h-3.5 w-3.5" /> Explore DekhoCampus
            </span>
            <h2 id="global-discovery-title" className="text-xl font-extrabold tracking-tight sm:text-2xl">Everything you need for your next decision</h2>
          </div>
          <Link to="/colleges" className="hidden items-center gap-1 text-sm font-bold text-primary hover:underline sm:flex">Explore all <ArrowRight className="h-4 w-4" /></Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((item) => (
            <Link
              key={item.key}
              to={item.href}
              className={`group relative flex min-h-[132px] flex-col items-center justify-center overflow-hidden rounded-3xl border p-4 text-center shadow-[0_12px_35px_-26px_rgba(15,23,42,.5)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_-24px_rgba(15,23,42,.38)] ${item.tint}`}
            >
              <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/45 to-transparent" aria-hidden="true" />
              <img src={item.img} alt="" loading="lazy" decoding="async" className="relative mb-3 h-14 w-14 object-contain transition-transform duration-300 group-hover:scale-110" />
              <span className="relative text-sm font-extrabold leading-tight text-slate-900">{item.label}</span>
              <span className="relative mt-1 text-[10px] font-bold text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">Explore now →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
