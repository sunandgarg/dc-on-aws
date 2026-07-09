import { useMemo } from "react";
import { useApprovalBodies } from "@/hooks/useApprovalBodies";
import { Badge } from "@/components/ui/badge";
import { UploadOrUrlField } from "@/components/UploadOrUrlField";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  /** Selected approval codes (e.g. ["AICTE","UGC"]) - stored on colleges.approvals */
  selectedCodes: string[];
  onCodesChange: (codes: string[]) => void;
  /** Optional: extra/custom logo URLs for bodies not in the library */
  customLogos?: string[];
  customNames?: string[];
  onCustomLogosChange?: (urls: string[]) => void;
  onCustomNamesChange?: (names: string[]) => void;
}

/**
 * Picker that lets admins toggle approval bodies from the central library.
 * Selected codes are saved to `colleges.approvals` and rendered on the public
 * page using the library's logo + name (no per-college upload needed).
 */
export function ApprovalBodyPicker({ selectedCodes, onCodesChange }: Props) {
  const { data: bodies = [], isLoading } = useApprovalBodies();
  const selected = useMemo(() => new Set(selectedCodes || []), [selectedCodes]);

  const toggle = (code: string) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onCodesChange(Array.from(next));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-muted-foreground">
          Approval Bodies - tap to select. Logos auto-load from the library.
        </label>
        <Link to="/admin/approval-bodies" target="_blank">
          <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px] gap-1">
            <Plus className="w-3 h-3" /> Manage Library
          </Button>
        </Link>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {bodies.map((b) => {
            const active = selected.has(b.code);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggle(b.code)}
                className={`relative bg-card rounded-lg border p-2 flex flex-col items-center justify-center gap-1 h-24 transition ${
                  active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"
                }`}
              >
                {b.logo_url ? (
                  <img src={b.logo_url} alt={b.name} className="h-8 max-w-full object-contain" />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">{b.code}</span>
                )}
                <span className="text-[10px] font-medium line-clamp-1">{b.code}</span>
                {active && <Badge className="absolute -top-1.5 -right-1.5 text-[9px] px-1.5">✓</Badge>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
