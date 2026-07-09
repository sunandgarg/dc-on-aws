import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  jsonLd?: object | object[];
}

/** Lightweight SEO updater - no extra deps. Sets document.title + meta tags + OG/Twitter + JSON-LD. */
export function SEO({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  ogType = "website",
  twitterCard = "summary_large_image",
  jsonLd,
}: SEOProps) {
  useEffect(() => {
    if (title) document.title = title;

    const setNameMeta = (name: string, content?: string) => {
      if (!content) return;
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.name = name;
        document.head.appendChild(el);
      }
      el.content = content;
    };

    const setPropMeta = (property: string, content?: string) => {
      if (!content) return;
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    if (description) setNameMeta("description", description);
    if (keywords) setNameMeta("keywords", keywords);

    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonical;
    }

    // OpenGraph
    if (title) setPropMeta("og:title", title);
    if (description) setPropMeta("og:description", description);
    if (canonical) setPropMeta("og:url", canonical);
    setPropMeta("og:type", ogType);
    if (ogImage) setPropMeta("og:image", ogImage);

    // Twitter
    setNameMeta("twitter:card", twitterCard);
    if (title) setNameMeta("twitter:title", title);
    if (description) setNameMeta("twitter:description", description);
    if (ogImage) setNameMeta("twitter:image", ogImage);

    // JSON-LD
    const id = "ld-json-page";
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    if (jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = id;
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, keywords, canonical, ogImage, ogType, twitterCard, JSON.stringify(jsonLd ?? null)]);
  return null;
}
