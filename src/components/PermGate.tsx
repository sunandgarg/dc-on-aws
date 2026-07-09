import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Module, Action } from "@/lib/rbac";

interface PermGateProps {
  module: Module;
  action: Action;
  ownerId?: string | null;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Renders children only if current user has the given permission.
 * For "edit_own" / similar, pass `ownerId` and the user must match - unless they have full edit.
 */
export function PermGate({ module, action, ownerId, fallback = null, children }: PermGateProps) {
  const { can, user, isAdmin } = useAuth();
  if (isAdmin) return <>{children}</>;

  // Full edit covers edit_own automatically
  if (action === "edit_own") {
    if (can(module, "edit")) return <>{children}</>;
    if (can(module, "edit_own") && ownerId && user?.id === ownerId) return <>{children}</>;
    return <>{fallback}</>;
  }
  return can(module, action) ? <>{children}</> : <>{fallback}</>;
}
