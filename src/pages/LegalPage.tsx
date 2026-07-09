import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";

export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase.from("legal_pages").select("*").eq("slug", slug).eq("is_active", true).maybeSingle()
      .then(({ data }) => { if (!cancelled) { setPage(data); setLoading(false); } });
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <>
      <SEO title={page?.meta_title || page?.title || "DekhoCampus"} description={page?.meta_description} canonical={typeof window !== "undefined" ? window.location.href : undefined} />
      <Navbar />
      <main className="container py-10 md:py-16 min-h-[60vh]">
        {loading ? (
          <div className="max-w-3xl mx-auto space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" />
          </div>
        ) : !page ? (
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-2">Page not found</h1>
            <p className="text-muted-foreground">This legal page hasn't been published yet.</p>
          </div>
        ) : (
          <article className="max-w-3xl mx-auto prose prose-slate dark:prose-invert">
            <h1 className="text-3xl md:text-4xl font-bold mb-6">{page.title}</h1>
            <div dangerouslySetInnerHTML={{ __html: page.content }} />
            <p className="text-xs text-muted-foreground mt-10">Last updated: {new Date(page.updated_at).toLocaleDateString()}</p>
          </article>
        )}
      </main>
      <Footer />
    </>
  );
}
