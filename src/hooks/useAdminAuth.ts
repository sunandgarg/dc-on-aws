import { useAuth } from "./useAuth";

export function useAdminAuth() {
  const { user, isAdmin, isLoading } = useAuth();
  return {
    isAdmin,
    isApproved: isAdmin,
    loading: isLoading,
    userEmail: user?.email ?? null,
    error: null,
    refetch: async () => {},
  };
}
