import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  href: string;
  label?: string;
  size?: "sm" | "icon" | "default";
  variant?: "outline" | "ghost" | "default";
  className?: string;
}

/** Opens the public page for an admin-managed entity in a new tab. */
export function OpenOnSiteButton({ href, label = "View", size = "icon", variant = "ghost", className }: Props) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" title="Open public page in new tab" className="inline-flex">
      <Button type="button" variant={variant} size={size} className={`gap-1 ${className ?? ""}`}>
        <ExternalLink className="w-3.5 h-3.5" />
        {size !== "icon" && <span className="text-xs">{label}</span>}
      </Button>
    </a>
  );
}
