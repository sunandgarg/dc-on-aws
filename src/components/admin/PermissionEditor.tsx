import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Module } from "@/lib/rbac";

const MODULES: Module[] = [
  "articles","colleges","courses","exams","study_material","leads","ads","banners",
  "promoted_programs","featured","applications","referrals","careers","companies",
  "placements","faculty","facilities","contacts","course_fees","partners","content","legal",
];
type ActionCol = "can_view" | "can_create" | "can_edit" | "can_publish" | "can_delete";
const ACTION_COLS: { key: ActionCol; label: string }[] = [
  { key: "can_view", label: "View" },
  { key: "can_create", label: "Create" },
  { key: "can_edit", label: "Edit" },
  { key: "can_publish", label: "Publish" },
  { key: "can_delete", label: "Delete" },
];

interface PermRow {
  id?: string;
  user_id: string;
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_publish: boolean;
  can_delete: boolean;
}

export function PermissionEditor({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: perms = [] } = useQuery<PermRow[]>({
    queryKey: ["user_permissions", userId],
    enabled: open,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("user_permissions")
        .select("id,user_id,resource,can_view,can_create,can_edit,can_publish,can_delete")
        .eq("user_id", userId);
      return (data as PermRow[]) || [];
    },
  });

  const byResource = new Map(perms.map((p) => [p.resource, p]));

  const toggle = async (resource: Module, col: ActionCol) => {
    const existing = byResource.get(resource);
    const nextValue = !(existing?.[col] ?? false);

    if (existing) {
      const updated = { ...existing, [col]: nextValue };
      // If all flags become false, drop the row entirely.
      if (!updated.can_view && !updated.can_create && !updated.can_edit && !updated.can_publish && !updated.can_delete) {
        const { error } = await (supabase as any)
          .from("user_permissions").delete().eq("id", existing.id);
        if (error) return toast.error(error.message);
      } else {
        const { error } = await (supabase as any)
          .from("user_permissions")
          .update({ [col]: nextValue, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) return toast.error(error.message);
      }
    } else {
      // Insert MUST include resource (NOT NULL). Default scope = 'own'.
      const payload: Record<string, any> = {
        user_id: userId,
        resource,
        scope: "own",
        can_view: col === "can_view" ? nextValue : false,
        can_create: col === "can_create" ? nextValue : false,
        can_edit: col === "can_edit" ? nextValue : false,
        can_publish: col === "can_publish" ? nextValue : false,
        can_delete: col === "can_delete" ? nextValue : false,
      };
      const { error } = await (supabase as any).from("user_permissions").insert(payload);
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["user_permissions", userId] });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1">
          <Settings2 className="w-3 h-3" />Custom permissions ({perms.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[640px] max-w-[95vw] max-h-[70vh] overflow-auto" align="start">
        <p className="text-xs text-muted-foreground mb-3">
          Grant fine-grained access on top of role. Useful for content writers needing edit access to specific modules only.
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">Module</th>
              {ACTION_COLS.map((a) => (
                <th key={a.key} className="text-center capitalize">{a.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m) => {
              const row = byResource.get(m);
              return (
                <tr key={m} className="border-t border-border">
                  <td className="py-1.5 capitalize">{m.replace(/_/g, " ")}</td>
                  {ACTION_COLS.map((a) => (
                    <td key={a.key} className="text-center">
                      <input
                        type="checkbox"
                        checked={!!row?.[a.key]}
                        onChange={() => toggle(m, a.key)}
                        className="cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </PopoverContent>
    </Popover>
  );
}
