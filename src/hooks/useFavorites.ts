import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface FavoriteRow {
  id: string;
  college_slug: string;
  created_at: string;
}

export function useFavorites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-favorites", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<FavoriteRow[]> => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from("user_favorites")
        .select("id, college_slug, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useToggleFavorite() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ collegeSlug, isFav }: { collegeSlug: string; isFav: boolean }) => {
      if (!user?.id) throw new Error("login_required");
      if (isFav) {
        const { error } = await (supabase as any)
          .from("user_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("college_slug", collegeSlug);
        if (error) throw error;
        return { removed: true };
      } else {
        const { error } = await (supabase as any)
          .from("user_favorites")
          .insert({ user_id: user.id, college_slug: collegeSlug });
        if (error) throw error;
        return { added: true };
      }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["user-favorites"] });
      toast.success(res.added ? "Added to favourites ❤️" : "Removed from favourites");
    },
    onError: (e: any) => {
      if (e?.message === "login_required") {
        toast.error("Please sign in to save favourites");
      } else {
        toast.error(e?.message || "Could not update favourites");
      }
    },
  });
}
