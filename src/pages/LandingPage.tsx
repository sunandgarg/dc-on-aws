import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ChevronDown } from "lucide-react";
import { MultipleCollegesBlock, type CollegeLite, type MultipleLayout } from "@/components/landing/MultipleCollegesBlock";
import { ExamAdBlocks, type ExamAd } from "@/components/landing/ExamAdBlocks";
import { LpComplianceFooter, LpComplianceHeader } from "@/components/landing/LpComplianceFooter";
import { trackEvent, trackLeadConversion } from "@/lib/analytics";
import { isStrictIndianMobile, normalizeIndianMobile } from "@/lib/phone";

interface LP {
  slug: string;
  lp_type?: "general" | "multiple_colleges" | "exam_ad";
  multiple_layout?: MultipleLayout;
  multiple_colleges?: CollegeLite[];
  exam_ad?: ExamAd;
  advertiser_name?: string; advertiser_address?: string; advertiser_contact?: string; disclosure_text?: string;
  brand_name: string; logo_url: string; nav_links: any[];
  cta_label: string; cta_href: string;
  eyebrow: string; hero_title: string; hero_subtitle: string;
  primary_cta_label: string; primary_cta_href: string;
  secondary_cta_label: string; secondary_cta_href: string;
  stats: { value: string; label: string }[];
  form_title: string; form_subtitle: string; form_courses: string[]; form_submit_label: string; form_consent_text: string;
  courses_title: string; courses_subtitle: string; courses: { tag?: string; title: string; duration?: string; level?: string }[];
  why_title: string; why_subtitle: string; why_items: { title: string; desc: string }[];
  testimonials_title: string; testimonials: { name: string; role?: string; quote: string }[];
  faqs: { q: string; a: string }[];
  footer_text: string; privacy_url: string; terms_url: string;
  meta_title: string; meta_description: string; meta_keywords: string; og_image: string;
  ga_id: string; gtm_id: string; meta_pixel_id: string;
  theme: { primary: string; ink: string; bg: string; accent: string };
}

export default function LandingPage() {
  const { slug = "lp" } = useParams<{ slug: string }>();
  const [params] = useSearchParams();

  const { data, isLoading } = useQuery({
    queryKey: ["landing_page", slug],
    queryFn: async () => {
      const { data } = await (supabase as any).from("landing_pages").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      return data as LP | null;
    },
  });

  useSEO({ title: data?.meta_title || data?.hero_title, description: data?.meta_description, keywords: data?.meta_keywords });

  // Inject GA / GTM / Meta Pixel for this LP
  useEffect(() => {
    if (!data) return;
    const cleanups: (() => void)[] = [];
    const inject = (id: string, html: string, src?: string) => {
      if (document.getElementById(id)) return;
      const s = document.createElement("script");
      s.id = id;
      if (src) { s.src = src; s.async = true; } else { s.text = html; }
      document.head.appendChild(s);
      cleanups.push(() => s.remove());
    };
    if (data.ga_id) {
      inject(`ga-src-${data.ga_id}`, "", `https://www.googletagmanager.com/gtag/js?id=${data.ga_id}`);
      inject(`ga-init-${data.ga_id}`, `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${data.ga_id}',{anonymize_ip:true});`);
    }
    if (data.gtm_id) {
      inject(`gtm-${data.gtm_id}`, `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${data.gtm_id}');`);
    }
    if (data.meta_pixel_id) {
      inject(`fbq-${data.meta_pixel_id}`, `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${data.meta_pixel_id}');fbq('track','PageView');`);
    }
    return () => cleanups.forEach((c) => c());
  }, [data]);

  // Track LP view once per slug for funnel attribution
  useEffect(() => {
    if (!data) return;
    trackEvent("lp_view", { lp_type: data.lp_type || "general", lp_slug: data.slug || slug });
  }, [data, slug]);

  const cssVars = useMemo(() => {
    const t = data?.theme || { primary: "#ee5a36", ink: "#0e2236", bg: "#ffffff", accent: "#ffeae3" };
    return { ["--lp-primary" as any]: t.primary, ["--lp-ink" as any]: t.ink, ["--lp-bg" as any]: t.bg, ["--lp-accent" as any]: t.accent } as React.CSSProperties;
  }, [data]);

  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "", state: "", course: "" });
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Landing page not found.</div>;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = normalizeIndianMobile(form.phone);
    if (!isStrictIndianMobile(phone)) return toast.error("Enter a valid 10-digit Indian mobile number");
    if (!form.name.trim()) return toast.error("Name is required");
    setSubmitting(true);
    const utm = {
      utm_source: params.get("utm_source"), utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"), utm_content: params.get("utm_content"),
      utm_term: params.get("utm_term"), gclid: params.get("gclid"), fbclid: params.get("fbclid"),
    };
    const { error } = await (supabase as any).from("landing_page_leads").insert({
      landing_slug: slug, ...form, phone, ...utm,
      referrer: document.referrer, page_url: window.location.href, consent: true,
    });
    setSubmitting(false);
    if (error) return toast.error("Could not submit - please try again");
    toast.success("Thanks! Our advisor will call you within 24 hours.");
    trackLeadConversion({ lp_type: data.lp_type || "general", lp_slug: slug, source: "lp_main_form" });
    setForm({ name: "", email: "", phone: "", city: "", state: "", course: "" });
  };

  return (
    <div id="top" className="min-h-screen pb-20 md:pb-0" style={{ ...cssVars, background: "var(--lp-bg)", color: "var(--lp-ink)" }}>
      <style>{`
        .lp-btn-primary{background:var(--lp-ink);color:#fff;transition:transform .15s ease}
        .lp-btn-primary:hover{transform:translateY(-1px)}
        .lp-btn-secondary{background:var(--lp-accent);color:var(--lp-primary)}
        .lp-tag{background:var(--lp-accent);color:var(--lp-primary)}
        .lp-card{border:1px solid #e7eaf0;border-radius:18px;background:#fff;transition:box-shadow .2s ease, transform .2s ease}
        .lp-card:hover{box-shadow:0 10px 30px -10px rgba(14,34,54,.12)}
        .lp-input{border:1px solid #e0e4ec;border-radius:10px;padding:.7rem .9rem;width:100%;background:#fff;color:var(--lp-ink)}
        .lp-input:focus{outline:none;border-color:var(--lp-primary);box-shadow:0 0 0 3px color-mix(in srgb, var(--lp-primary) 18%, transparent)}
        .lp-trust{display:flex;flex-wrap:wrap;gap:1.25rem;align-items:center;opacity:.85}
        .lp-trust span{font-size:.78rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--lp-ink)}
      `}</style>

      {/* Compliance header is used for the new LP types; general LP keeps the legacy minimal header */}
      {data.lp_type && data.lp_type !== "general" ? (
        <LpComplianceHeader
          brand={data.brand_name}
          logoUrl={data.logo_url}
          navLinks={data.nav_links || []}
          ctaLabel={data.cta_label}
          ctaHref={data.cta_href}
        />
      ) : (
        <header className="px-5 md:px-12 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            {data.logo_url ? <img src={data.logo_url} alt={data.brand_name} className="h-8" /> : <span style={{ color: "var(--lp-primary)" }}>◣◣</span>}
            <span>{data.brand_name}</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm">
            {(data.nav_links || []).map((n: any, i: number) => <a key={i} href={n.href} className="hover:opacity-80">{n.label}</a>)}
          </nav>
          <a href={data.cta_href}><Button className="lp-btn-primary rounded-md px-5">{data.cta_label}</Button></a>
        </header>
      )}

      <section className="px-5 md:px-12 grid lg:grid-cols-2 gap-10 py-8 md:py-14">
        <div>
          {data.eyebrow && <span className="lp-tag inline-block px-3 py-1 rounded-full text-xs font-semibold mb-5">{data.eyebrow}</span>}
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">{data.hero_title}</h1>
          <p className="mt-5 text-lg opacity-80 max-w-lg">{data.hero_subtitle}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={data.primary_cta_href}><Button className="lp-btn-primary rounded-md px-6 py-6">{data.primary_cta_label}</Button></a>
            <a href={data.secondary_cta_href}><Button variant="ghost" className="lp-btn-secondary rounded-md px-6 py-6">{data.secondary_cta_label}</Button></a>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {(data.stats || []).map((s, i) => (
              <div key={i} className="lp-card p-4 text-center">
                <div className="text-2xl font-extrabold">{s.value}</div>
                <div className="text-xs opacity-70 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <form id="apply-card" onSubmit={onSubmit} className="lp-card p-6 md:p-8 self-start w-full">
          <h3 className="text-xl font-bold">{data.form_title}</h3>
          <p className="text-sm opacity-70 mt-1 mb-5">{data.form_subtitle}</p>
          <div className="space-y-4">
            <div><Label className="text-xs">Full name *</Label><input className="lp-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter Your Full Name" /></div>
            <div><Label className="text-xs">Email *</Label><input type="email" className="lp-input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Enter Your Email Address" /></div>
            <div><Label className="text-xs">Phone *</Label><input className="lp-input" required inputMode="numeric" maxLength={15} value={form.phone} onChange={(e) => setForm({ ...form, phone: normalizeIndianMobile(e.target.value) })} placeholder="Enter Your Phone Number" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">City *</Label><input className="lp-input" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Enter Your City" /></div>
              <div><Label className="text-xs">State *</Label><input className="lp-input" required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Enter Your State" /></div>
            </div>
            <div>
              <Label className="text-xs">Course *</Label>
              <select required className="lp-input" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })}>
                <option value="">Select a program</option>
                {(data.form_courses || []).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Button type="submit" disabled={submitting} className="lp-btn-primary w-full rounded-md py-6 text-base font-bold tracking-wide">{submitting ? "Submitting..." : data.form_submit_label}</Button>
            <p className="text-[11px] opacity-60 leading-relaxed">{data.form_consent_text} <a className="underline" href={data.privacy_url}>Privacy</a> · <a className="underline" href={data.terms_url}>Terms</a></p>
          </div>
        </form>
      </section>

      {/* === Type-specific blocks === */}
      {data.lp_type === "multiple_colleges" && (
        <MultipleCollegesBlock
          layout={data.multiple_layout || "compact"}
          colleges={data.multiple_colleges || []}
          title={data.courses_title || "Featured colleges"}
          subtitle={data.courses_subtitle}
        />
      )}

      {data.lp_type === "exam_ad" && data.exam_ad && (
        <ExamAdBlocks data={data.exam_ad} slug={slug} />
      )}

      {/* General LP: keep the legacy course/why/testimonial/faq sections */}
      {(!data.lp_type || data.lp_type === "general") && (
        <>
          <section id="courses" className="px-5 md:px-12 py-10 md:py-14">
            <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
              <div>
                <h2 className="text-3xl font-extrabold">{data.courses_title}</h2>
                <p className="opacity-70 mt-1">{data.courses_subtitle}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(data.courses || []).map((c, i) => (
                <div key={i} className="lp-card p-5">
                  {c.tag && <span className="lp-tag inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold mb-3">{c.tag}</span>}
                  <h3 className="text-lg font-bold leading-snug">{c.title}</h3>
                  {(c.duration || c.level) && <p className="text-sm opacity-70 mt-3">{[c.duration, c.level].filter(Boolean).join(" · ")}</p>}
                </div>
              ))}
            </div>
          </section>

          {(data.why_items || []).length > 0 && (
            <section id="why" className="px-5 md:px-12 py-10 md:py-14" style={{ background: "var(--lp-accent)" }}>
              <h2 className="text-3xl font-extrabold">{data.why_title}</h2>
              {data.why_subtitle && <p className="opacity-80 mt-1 mb-6">{data.why_subtitle}</p>}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {data.why_items.map((w, i) => (
                  <div key={i} className="lp-card p-5">
                    <h3 className="font-bold">{w.title}</h3>
                    <p className="text-sm opacity-75 mt-2">{w.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(data.testimonials || []).length > 0 && (
            <section className="px-5 md:px-12 py-10 md:py-14">
              <h2 className="text-3xl font-extrabold mb-6">{data.testimonials_title}</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {data.testimonials.map((t, i) => (
                  <div key={i} className="lp-card p-5">
                    <p className="opacity-90">"{t.quote}"</p>
                    <p className="text-sm opacity-70 mt-3">- {t.name}{t.role ? `, ${t.role}` : ""}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {(data.faqs || []).length > 0 && (
        <section className="px-5 md:px-12 py-10 md:py-14" style={{ background: "var(--lp-accent)" }}>
          <h2 className="text-3xl font-extrabold mb-6">Frequently asked questions</h2>
          <div className="space-y-3 max-w-3xl">
            {data.faqs.map((f, i) => (
              <details key={i} className="lp-card p-5 group">
                <summary className="flex justify-between items-center cursor-pointer font-semibold">{f.q}<ChevronDown className="w-4 h-4 group-open:rotate-180 transition" /></summary>
                <p className="opacity-80 mt-3 text-sm leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Footer: compliance footer for new LP types; legacy minimal footer for general LP */}
      {data.lp_type && data.lp_type !== "general" ? (
        <LpComplianceFooter
          brand={data.brand_name}
          advertiserName={data.advertiser_name}
          advertiserAddress={data.advertiser_address}
          advertiserContact={data.advertiser_contact}
          disclosureText={data.disclosure_text}
          privacyUrl={data.privacy_url}
          termsUrl={data.terms_url}
          footerText={data.footer_text}
        />
      ) : (
        <footer className="px-5 md:px-12 py-8 text-center text-sm opacity-70 border-t">
          {data.footer_text} · <a href={data.privacy_url} className="underline">Privacy</a> · <a href={data.terms_url} className="underline">Terms</a>
        </footer>
      )}

      {/* Mobile sticky CTA */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t p-3 flex gap-2">
        <a href="tel:+919999999999" className="flex-1"><Button variant="outline" className="w-full rounded-md">Call</Button></a>
        <a href="#apply-card" className="flex-1"><Button className="lp-btn-primary w-full rounded-md">{data.primary_cta_label}</Button></a>
      </div>
    </div>
  );
}
