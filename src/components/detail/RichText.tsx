import { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";

interface RichTextProps {
  html?: string | null;
  className?: string;
}

/**
 * Sanitised admin-authored HTML renderer.
 *
 * - Allowlist via DOMPurify (no <script>, no event handlers, no javascript: URLs).
 * - Tailwind Typography (`prose`) styling for headings, lists, blockquotes, code.
 * - Tables are wrapped in horizontal-scroll containers per-table on mobile.
 * - Images get rounded corners + auto-fit + optional caption from `title`/`alt`.
 */

const ALLOWED_TAGS = [
  "h1","h2","h3","h4","h5","h6",
  "p","br","hr","span","div","section","article",
  "strong","b","em","i","u","s","strike","sub","sup","mark","small",
  "ul","ol","li",
  "blockquote","q","cite",
  "a","img","figure","figcaption","picture","source",
  "table","thead","tbody","tfoot","tr","th","td","caption","colgroup","col",
  "code","pre","kbd","samp","var",
];

const ALLOWED_ATTR = [
  "href","target","rel","title","alt","src","srcset","sizes","loading","decoding",
  "width","height","colspan","rowspan","scope","start","reversed","type",
  "class","style","id","name",
];

function postProcess(html: string): string {
  if (typeof window === "undefined") return html;
  const tpl = document.createElement("template");
  tpl.innerHTML = html;

  // Tables → wrap in scroll container
  tpl.content.querySelectorAll("table").forEach((tbl) => {
    if (tbl.parentElement?.classList.contains("rt-table-wrap")) return;
    const wrap = document.createElement("div");
    wrap.className = "rt-table-wrap";
    tbl.parentNode?.insertBefore(wrap, tbl);
    wrap.appendChild(tbl);
  });

  // Links open external in new tab safely
  tpl.content.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (/^https?:\/\//i.test(href)) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    }
  });

  // Images → lazy + decoding async; wrap with figure for caption when title present
  tpl.content.querySelectorAll("img").forEach((img) => {
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
    const cap = img.getAttribute("title") || "";
    if (cap && img.parentElement?.tagName.toLowerCase() !== "figure") {
      const fig = document.createElement("figure");
      fig.className = "rt-figure";
      const figCap = document.createElement("figcaption");
      figCap.textContent = cap;
      img.parentNode?.insertBefore(fig, img);
      fig.appendChild(img);
      fig.appendChild(figCap);
    }
  });

  return tpl.innerHTML;
}

export function RichText({ html, className }: RichTextProps) {
  const safe = useMemo(() => {
    if (!html) return "";
    const trimmed = html.trim();
    if (!trimmed) return "";
    const looksLikeHtml = /<[a-z][\s\S]*>/i.test(trimmed);
    if (!looksLikeHtml) return "";
    const cleaned = DOMPurify.sanitize(trimmed, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      FORBID_ATTR: ["onerror","onclick","onload","onmouseover","onfocus","onblur"],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[#./])/i,
    });
    return postProcess(cleaned);
  }, [html]);

  if (!html) return null;
  const trimmed = html.trim();
  if (!trimmed) return null;

  const proseClasses = cn(
    "prose prose-neutral max-w-none",
    "text-[15px] leading-[1.75]",
    "prose-p:text-[15px] prose-p:leading-[1.75] prose-p:text-foreground/90 prose-p:my-3",
    "prose-headings:text-foreground prose-headings:font-extrabold prose-headings:tracking-tight",
    "prose-h1:text-[26px] md:prose-h1:text-3xl prose-h1:mt-7 prose-h1:mb-3",
    "prose-h2:text-[22px] md:prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3",
    "prose-h3:text-lg md:prose-h3:text-xl prose-h3:mt-5 prose-h3:mb-2",
    "prose-h4:text-base md:prose-h4:text-lg prose-h4:mt-4 prose-h4:mb-2",
    "prose-h5:text-sm prose-h5:font-bold prose-h5:mt-3 prose-h5:mb-1",
    "prose-h6:text-sm prose-h6:font-bold prose-h6:mt-3 prose-h6:mb-1",
    "prose-strong:text-foreground prose-strong:font-bold",
    "prose-em:italic",
    "prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline",
    "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/40 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-foreground/85 prose-blockquote:rounded-r-md prose-blockquote:my-4",
    "prose-ul:my-3 prose-ol:my-3 prose-li:my-1.5 prose-li:text-foreground/90 prose-li:marker:text-primary prose-li:marker:font-bold",
    "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
    "prose-pre:bg-muted prose-pre:text-foreground prose-pre:rounded-xl prose-pre:p-3",
    "prose-hr:border-border prose-hr:my-6",
    // Figures / images
    "[&_img]:rounded-xl [&_img]:border [&_img]:border-border [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4 [&_img]:mx-auto [&_img]:block",
    "[&_figure]:my-5 [&_figure]:text-center",
    "[&_figcaption]:mt-2 [&_figcaption]:text-xs [&_figcaption]:text-muted-foreground [&_figcaption]:italic",
    // Tables - modern, appealing styling
    "[&_.rt-table-wrap]:w-full [&_.rt-table-wrap]:overflow-x-auto [&_.rt-table-wrap]:my-5 [&_.rt-table-wrap]:rounded-xl [&_.rt-table-wrap]:border [&_.rt-table-wrap]:border-border [&_.rt-table-wrap]:shadow-sm [&_.rt-table-wrap]:bg-card",
    "[&_table]:w-full [&_table]:text-sm [&_table]:border-collapse [&_table]:m-0",
    "[&_thead]:bg-gradient-to-r [&_thead]:from-primary/10 [&_thead]:to-primary/[0.04]",
    "[&_th]:text-left [&_th]:font-bold [&_th]:text-foreground [&_th]:px-3 [&_th]:py-2.5 md:[&_th]:px-4 md:[&_th]:py-3 [&_th]:border-b [&_th]:border-primary/20 [&_th]:whitespace-nowrap [&_th]:tracking-tight",
    "[&_td]:px-3 [&_td]:py-2.5 md:[&_td]:px-4 md:[&_td]:py-3 [&_td]:border-b [&_td]:border-border/70 [&_td]:text-foreground/90 [&_td]:align-top",
    "[&_tbody_tr:last-child_td]:border-b-0",
    "[&_tbody_tr:nth-child(even)]:bg-muted/30",
    "[&_tbody_tr:hover]:bg-primary/[0.04] [&_tbody_tr]:transition-colors",
    className,
  );

  if (!safe) {
    // Plain text fallback - preserve paragraph breaks
    return (
      <p className={cn("text-[15px] leading-[1.75] text-foreground/90 whitespace-pre-line", className)}>
        {trimmed}
      </p>
    );
  }

  return <div className={proseClasses} dangerouslySetInnerHTML={{ __html: safe }} />;
}
