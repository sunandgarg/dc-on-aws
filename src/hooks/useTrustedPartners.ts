import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureBootstrap } from "@/lib/bootstrap";

export interface TrustedPartner {
  id: string;
  college_slug: string;
  name: string;
  logo_url: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useTrustedPartners() {
  return useQuery({
    queryKey: ["trusted-partners"],
    queryFn: async () => {
      const boot = await ensureBootstrap();
      if (boot?.trusted_partners) return boot.trusted_partners as TrustedPartner[];
      const { data, error } = await supabase
        .from("trusted_partners" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TrustedPartner[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useAllTrustedPartners() {
  return useQuery({
    queryKey: ["trusted-partners-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trusted_partners" as any)
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TrustedPartner[];
    },
  });
}

export function useUpsertTrustedPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (partner: Partial<TrustedPartner> & { name: string }) => {
      if (partner.id) {
        const { error } = await supabase.from("trusted_partners" as any).update(partner as any).eq("id", partner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trusted_partners" as any).insert(partner as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trusted-partners"] }),
  });
}

export function useDeleteTrustedPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trusted_partners" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trusted-partners"] }),
  });
}
