import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Linkedin, Twitter, ExternalLink } from "lucide-react";

interface About {
  page: any;
  stats: any[];
  values: any[];
  founders: any[];
  team: any[];
  milestones: any[];
  press: any[];
}

export default function AboutUs() {
  const [d, setD] = useState<About>({ page: null, stats: [], values: [], founders: [], team: [], milestones: [], press: [] });

  useEffect(() => {
    const load = async () => {
      const s: any = supabase;
      const [page, stats, values, founders, team, milestones, press] = await Promise.all([
        s.from("about_page").select("*").maybeSingle(),
        s.from("about_stats").select("*").eq("is_active", true).order("display_order"),
        s.from("about_values").select("*").eq("is_active", true).order("display_order"),
        s.from("about_founders").select("*").eq("is_active", true).order("display_order"),
        s.from("about_team").select("*").eq("is_active", true).order("display_order"),
        s.from("about_milestones").select("*").eq("is_active", true).order("display_order"),
        s.from("about_press").select("*").eq("is_active", true).order("display_order"),
      ]);
      setD({
        page: page.data,
        stats: stats.data || [],
        values: values.data || [],
        founders: founders.data || [],
        team: team.data || [],
        milestones: milestones.data || [],
        press: press.data || [],
      });
    };
    load();
  }, []);

  const p = d.page || {};

  return (
    <div className="min-h-screen bg-background">
      <SEO title={p.meta_title || "About Us - DekhoCampus"} description={p.meta_description || "Learn about DekhoCampus, our mission, team and story."} canonical="/about-us" />
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16">
        <div className="container">
          <div className="max-w-3xl">
            {p.hero_eyebrow && <p className="text-sm font-semibold text-primary uppercase mb-3">{p.hero_eyebrow}</p>}
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">{p.hero_title || "About Us"}</h1>
            {p.hero_subtitle && <p className="text-lg text-muted-foreground">{p.hero_subtitle}</p>}
          </div>
          {p.hero_image && <img src={p.hero_image} alt="" className="mt-8 rounded-2xl w-full max-h-96 object-cover" />}
        </div>
      </section>

      {/* Stats */}
      {d.stats.length > 0 && (
        <section className="py-12 border-b border-border">
          <div className="container grid grid-cols-2 md:grid-cols-4 gap-6">
            {d.stats.map((s) => (
              <div key={s.id} className="text-center">
                {s.icon_emoji && <div className="text-3xl mb-2">{s.icon_emoji}</div>}
                <div className="text-3xl md:text-4xl font-extrabold text-primary">{s.value}</div>
                <div className="text-sm font-semibold text-foreground mt-1">{s.label}</div>
                {s.description && <div className="text-xs text-muted-foreground mt-1">{s.description}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mission & Vision */}
      {(p.mission || p.vision) && (
        <section className="py-16">
          <div className="container grid md:grid-cols-2 gap-8">
            {p.mission && (
              <div className="bg-card border border-border rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-foreground mb-3">Our Mission</h2>
                <p className="text-muted-foreground whitespace-pre-line">{p.mission}</p>
              </div>
            )}
            {p.vision && (
              <div className="bg-card border border-border rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-foreground mb-3">Our Vision</h2>
                <p className="text-muted-foreground whitespace-pre-line">{p.vision}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Story */}
      {p.story && (
        <section className="py-12 bg-muted/30">
          <div className="container grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-4">Our Story</h2>
              <p className="text-muted-foreground whitespace-pre-line">{p.story}</p>
            </div>
            {p.story_image && <img src={p.story_image} alt="Our story" className="rounded-2xl w-full" />}
          </div>
        </section>
      )}

      {/* Values */}
      {d.values.length > 0 && (
        <section className="py-16">
          <div className="container">
            <h2 className="text-3xl font-bold text-foreground text-center mb-10">Our Values</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {d.values.map((v) => (
                <div key={v.id} className="bg-card border border-border rounded-xl p-6">
                  {v.icon_emoji && <div className="text-3xl mb-3">{v.icon_emoji}</div>}
                  <h3 className="text-lg font-bold text-foreground mb-2">{v.title}</h3>
                  {v.description && <p className="text-sm text-muted-foreground">{v.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Founders */}
      {d.founders.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container">
            <h2 className="text-3xl font-bold text-foreground text-center mb-10">Founders</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {d.founders.map((f) => (
                <div key={f.id} className="bg-card border border-border rounded-2xl p-6 text-center">
                  {f.photo && <img src={f.photo} alt={f.name} className="w-24 h-24 rounded-full object-cover mx-auto mb-4" />}
                  <h3 className="text-lg font-bold text-foreground">{f.name}</h3>
                  {f.title && <p className="text-sm text-primary font-semibold">{f.title}</p>}
                  {f.bio && <p className="text-sm text-muted-foreground mt-2">{f.bio}</p>}
                  <div className="flex justify-center gap-3 mt-3">
                    {f.linkedin_url && <a href={f.linkedin_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary"><Linkedin className="w-4 h-4" /></a>}
                    {f.twitter_url && <a href={f.twitter_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary"><Twitter className="w-4 h-4" /></a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Team */}
      {d.team.length > 0 && (
        <section className="py-16">
          <div className="container">
            <h2 className="text-3xl font-bold text-foreground text-center mb-10">Meet Our Team</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {d.team.map((t) => (
                <div key={t.id} className="bg-card border border-border rounded-xl p-4 text-center">
                  {t.photo && <img src={t.photo} alt={t.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-3" />}
                  <h4 className="text-sm font-bold text-foreground">{t.name}</h4>
                  {t.role && <p className="text-xs text-primary">{t.role}</p>}
                  {t.department && <p className="text-xs text-muted-foreground">{t.department}</p>}
                  {t.linkedin_url && <a href={t.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex mt-2 text-muted-foreground hover:text-primary"><Linkedin className="w-3 h-3" /></a>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Milestones */}
      {d.milestones.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container max-w-3xl">
            <h2 className="text-3xl font-bold text-foreground text-center mb-10">Our Journey</h2>
            <ol className="relative border-l-2 border-primary/30 ml-3 space-y-8">
              {d.milestones.map((m) => (
                <li key={m.id} className="ml-6">
                  <span className="absolute -left-[9px] w-4 h-4 rounded-full bg-primary" />
                  <div className="text-sm font-bold text-primary">{m.year}</div>
                  <h3 className="text-lg font-bold text-foreground">{m.title}</h3>
                  {m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Press */}
      {d.press.length > 0 && (
        <section className="py-16">
          <div className="container">
            <h2 className="text-3xl font-bold text-foreground text-center mb-10">In The Press</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {d.press.map((pr) => (
                <a key={pr.id} href={pr.url} target="_blank" rel="noreferrer" className="bg-card border border-border rounded-xl p-5 hover:shadow-md group">
                  <div className="flex items-center gap-3 mb-3">
                    {pr.logo && <img src={pr.logo} alt={pr.outlet} className="h-8 object-contain" />}
                    <span className="text-sm font-semibold text-foreground">{pr.outlet}</span>
                  </div>
                  <h4 className="text-sm font-medium text-foreground group-hover:text-primary line-clamp-3">{pr.headline}</h4>
                  {pr.published_on && <p className="text-xs text-muted-foreground mt-2">{pr.published_on}</p>}
                  <span className="inline-flex items-center gap-1 text-xs text-primary mt-2"><ExternalLink className="w-3 h-3" /> Read</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      {(p.cta_title || p.cta_subtitle) && (
        <section className="py-16 bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="container text-center max-w-2xl">
            {p.cta_title && <h2 className="text-3xl font-bold text-foreground mb-3">{p.cta_title}</h2>}
            {p.cta_subtitle && <p className="text-muted-foreground">{p.cta_subtitle}</p>}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
