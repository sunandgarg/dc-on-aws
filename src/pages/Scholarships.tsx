import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { SEO } from "@/components/SEO";
import { Award, Calendar, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { currentYear } from "@/lib/currentYear";

export default function Scholarships() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("scholarships").select("*").eq("is_active", true)
        .order("display_order", { ascending: true });
      setItems(data || []);
    })();
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <SEO title={`Live Scholarships in India ${currentYear()} | DekhoCampus`} description="Latest scholarships for Indian students - apply for live merit, need-based, and government scholarships." />
      <Navbar />
      <main className="container py-8">
        <div className="flex items-center gap-3 mb-6">
          <Award className="w-7 h-7 text-orange-600" />
          <h1 className="text-2xl md:text-3xl font-bold">Live Scholarships</h1>
        </div>
        <AlsoCheckSection variant="strip" className="mb-4" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((s) => (
            <Link key={s.id} to={`/scholarships/${s.slug}`} className="border border-border rounded-xl p-4 hover:border-primary hover:shadow-md transition bg-card">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground line-clamp-2">{s.title}</h3>
                {s.is_live && <Badge className="bg-red-100 text-red-700">Live</Badge>}
              </div>
              {s.provider && <p className="text-xs text-muted-foreground mt-1">by {s.provider}</p>}
              <div className="mt-3 space-y-1 text-sm">
                {s.amount && <p className="flex items-center gap-1.5 text-foreground"><IndianRupee className="w-3.5 h-3.5" />{s.amount}</p>}
                {s.deadline && <p className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="w-3.5 h-3.5" />Apply by {s.deadline}</p>}
              </div>
            </Link>
          ))}
          {!items.length && <p className="text-muted-foreground col-span-full">No live scholarships at the moment.</p>}
        </div>
      </main>
      <Footer />
    </div>
  );
}
