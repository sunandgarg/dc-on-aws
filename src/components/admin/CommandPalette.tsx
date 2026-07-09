import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useAuth } from "@/hooks/useAuth";
import { Module } from "@/lib/rbac";

const ITEMS: Array<{ label: string; href: string; module?: Module; keywords?: string }> = [
  { label: "Dashboard", href: "/admin" },
  { label: "Colleges", href: "/admin/colleges", module: "colleges" },
  { label: "Courses", href: "/admin/courses", module: "courses" },
  { label: "Exams", href: "/admin/exams", module: "exams" },
  { label: "Articles", href: "/admin/articles", module: "articles" },
  { label: "Study Material", href: "/admin/study-material", module: "study_material" },
  { label: "Leads", href: "/admin/leads", module: "leads" },
  { label: "Applications", href: "/admin/applications", module: "applications" },
  { label: "Referrals", href: "/admin/referrals", module: "referrals" },
  { label: "Users & Roles", href: "/admin/users", module: "users" },
  { label: "Ads Manager", href: "/admin/ads", module: "ads" },
  { label: "Trending Programs", href: "/admin/promoted-programs", module: "promoted_programs" },
  { label: "Featured Colleges", href: "/admin/featured", module: "featured" },
  { label: "Banners", href: "/admin/banners", module: "banners" },
  { label: "Integrations (GA / GTM / Clarity)", href: "/admin/integrations", module: "integrations" },
  { label: "AI Providers", href: "/admin/ai-providers", module: "ai_providers" },
  { label: "OTP Providers", href: "/admin/otp-providers", module: "otp_providers" },
  { label: "System Logs", href: "/admin/logs" },
  { label: "Explain System (Dev + Layman + Live Logs)", href: "/admin/explain-system" },
  { label: "Backup & Restore", href: "/admin/backup", module: "backup" },
  { label: "Sitemap", href: "/admin/sitemap", module: "sitemap" },
  { label: "Legal Pages", href: "/admin/legal", module: "legal" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, canAccess } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visible = ITEMS.filter((i) => !i.module || isAdmin || canAccess(i.module));

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to admin section… (⌘K)" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {visible.map((i) => (
            <CommandItem
              key={i.href}
              onSelect={() => {
                navigate(i.href);
                setOpen(false);
              }}
            >
              {i.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
