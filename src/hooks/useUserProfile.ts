import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isSyntheticPhoneEmail } from "@/lib/authIdentity";

export interface UserProfilePrefill {
  name: string;
  email: string;
  phone: string;
  state: string;
  city: string;
}

/**
 * Fetches the logged-in user's profile and returns a prefill-ready object
 * for any lead / application form. Cached aggressively (sessions persist for
 * months thanks to Supabase auth localStorage + autoRefreshToken).
 */
export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<UserProfilePrefill | null> => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, email, phone, state, city")
        .eq("user_id", user.id)
        .maybeSingle();
      const rawEmail = data?.email || user.email || "";
      const realEmail = isSyntheticPhoneEmail(rawEmail) ? "" : rawEmail;
      return {
        name: data?.display_name || user.user_metadata?.display_name || user.user_metadata?.full_name || "",
        email: realEmail,
        phone: data?.phone || user.user_metadata?.phone || "",
        state: data?.state || "",
        city: data?.city || "",
      };
    },
  });
}
