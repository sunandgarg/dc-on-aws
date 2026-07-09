import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ApprovalBody = {
  id: string;
  code: string;
  name: string;
  logo_url: string;
  description: string;
  display_order: number;
  is_active: boolean;
};

export function useApprovalBodies() {
  return useQuery({
    queryKey: ["approval_bodies"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("approval_bodies")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data || []) as ApprovalBody[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllApprovalBodies() {
  return useQuery({
    queryKey: ["approval_bodies_all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("approval_bodies").select("*").order("display_order");
      if (error) throw error;
      return (data || []) as ApprovalBody[];
    },
    staleTime: 60 * 1000,
  });
}

export function useSaveApprovalBody() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: Partial<ApprovalBody> & { code: string; name: string }) => {
      if (b.id) {
        const { id, ...rest } = b;
        const { error } = await (supabase as any).from("approval_bodies").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("approval_bodies").insert(b);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval_bodies"] });
      qc.invalidateQueries({ queryKey: ["approval_bodies_all"] });
      toast.success("Approval body saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteApprovalBody() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("approval_bodies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval_bodies"] });
      qc.invalidateQueries({ queryKey: ["approval_bodies_all"] });
      toast.success("Deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
