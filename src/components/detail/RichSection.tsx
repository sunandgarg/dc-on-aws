import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichSectionProps {
  id?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  children: ReactNode;
  /** Kept for backward compatibility - no longer renders a colored bar/chip. */
  eyebrow?: string;
  emoji?: string;
  accent?: "primary" | "accent";
  readTime?: string;
  /** When true (default), section is collapsed by default with a chevron toggle. */
  collapsible?: boolean;
  defaultOpen?: boolean;
}

/**
 * Editorial section block with optional collapsible body.
 * Content stays in the DOM (display:none when closed) so SEO crawlers still index it.
 */
export function RichSection({
  id,
  title,
  subtitle,
  className,
  children,
  collapsible = true,
  defaultOpen = false,
}: RichSectionProps) {
  const [open, setOpen] = useState(!collapsible || defaultOpen);

  const toggle = () => collapsible && setOpen((v) => !v);

  return (
    <section
      id={id}
      className={cn(
        "bg-card rounded-2xl border border-border p-5 md:p-6 scroll-mt-32",
        className,
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        disabled={!collapsible}
        className={cn(
          "flex w-full items-start justify-between gap-3 text-left",
          collapsible && "group cursor-pointer",
        )}
      >
        <div className="flex-1 min-w-0">
          <h2 data-h className="text-xl md:text-[22px] font-extrabold text-foreground leading-tight tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
          )}
        </div>
        {collapsible && (
          <span
            className={cn(
              "shrink-0 mt-1 inline-flex items-center justify-center w-8 h-8 rounded-full border border-border bg-background text-muted-foreground transition-transform",
              open && "rotate-180 text-primary border-primary/40 bg-primary/5",
              "group-hover:border-primary/40 group-hover:text-primary",
            )}
            aria-hidden
          >
            <ChevronDown className="w-4 h-4" />
          </span>
        )}
      </button>
      <div
        className={cn(
          "transition-[max-height,opacity] duration-300",
          open ? "mt-4 max-h-none opacity-100 overflow-visible" : "max-h-0 opacity-0 overflow-hidden",
        )}
        // Keep mounted for SEO; visually hidden when closed.
        aria-hidden={!open}
      >
        {children}
      </div>
    </section>
  );
}
