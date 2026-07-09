import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { DefaultFaq } from "@/lib/defaultFaqs";

interface FAQSectionProps {
  page?: string;
  itemSlug?: string;
  title?: string;
  limit?: number;
  /** Fallback FAQs to render if no DB rows exist for this item. */
  fallback?: DefaultFaq[];
}

export function FAQSection({ page = "homepage", itemSlug, title = "Frequently Asked Questions", limit = 10, fallback }: FAQSectionProps) {
  const { data: dbFaqs } = useQuery({
    queryKey: ["faqs", page, itemSlug],
    queryFn: async () => {
      let q = supabase
        .from("faqs")
        .select("*")
        .eq("is_active", true)
        .eq("page", page)
        .order("display_order", { ascending: true })
        .limit(limit);
      if (itemSlug) q = q.eq("item_slug", itemSlug);
      else q = q.is("item_slug", null);
      const { data } = await q;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const faqs = (dbFaqs && dbFaqs.length > 0)
    ? dbFaqs.map((f: any) => ({ id: f.id, question: f.question, answer: f.answer }))
    : (fallback ?? []).map((f, i) => ({ id: `fb-${i}`, question: f.question, answer: f.answer }));

  // FAQPage JSON-LD for SEO + GEO (AI search engines) - must run before any early return
  useEffect(() => {
    if (!faqs.length) return;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    };
    const id = `faq-jsonld-${page}-${itemSlug || "default"}`;
    let tag = document.getElementById(id) as HTMLScriptElement | null;
    if (!tag) {
      tag = document.createElement("script");
      tag.type = "application/ld+json";
      tag.id = id;
      document.head.appendChild(tag);
    }
    tag.textContent = JSON.stringify(jsonLd);
    return () => { tag?.remove(); };
  }, [faqs, page, itemSlug]);

  if (!faqs.length) return null;

  return (
    <section className="py-12 md:py-16">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
            <HelpCircle className="w-4 h-4" />
            FAQs
          </div>
          <h2 className="text-headline font-bold text-foreground">{title}</h2>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="bg-card rounded-2xl border border-border px-5 data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left text-sm font-semibold text-foreground hover:no-underline py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
