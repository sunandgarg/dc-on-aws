import { Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Module } from "@/lib/rbac";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  module?: Module;
}

export function ProtectedRoute({ children, requireAdmin = false, module }: ProtectedRouteProps) {
  const { user, isAdmin, roles, canAccess, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // Lead-Push-Only role: allow Lead Push routes + All Leads regardless of `requireAdmin`
  const isLeadPushUser = roles.includes("lead_push");
  const onLeadPushArea =
    location.pathname.startsWith("/admin/lead-push") || location.pathname.startsWith("/admin/leads");

  const allowed =
    isAdmin ||
    (isLeadPushUser && onLeadPushArea) ||
    (module ? canAccess(module) : !requireAdmin);

  if ((requireAdmin || module) && !allowed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Access Restricted</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission for this section. Contact a super admin to update your role.
          </p>
          <Link to="/"><Button className="rounded-xl">Back to Home</Button></Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
