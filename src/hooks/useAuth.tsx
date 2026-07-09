import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AppRole, can, canAccessModule, Module, Action } from "@/lib/rbac";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  roles: AppRole[];
  isLoading: boolean;
  can: (module: Module, action: Action) => boolean;
  canAccess: (module: Module) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAdmin: false,
  roles: [],
  isLoading: true,
  can: () => false,
  canAccess: () => false,
  signOut: async () => {},
});

// Hardcoded super-admin guarantees: emails + phone numbers
const SUPER_ADMIN_EMAILS = ["sunandgarg@gmail.com"];
const SUPER_ADMIN_PHONES = ["8700602524", "9990109393", "8010321712"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [grants, setGrants] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const loadRoles = useCallback(async (user: User) => {
    try {
      const email = (user.email || "").toLowerCase();
      const phone = (user.user_metadata?.phone || user.phone || "").replace(/\D/g, "").slice(-10);
      const isSuper = SUPER_ADMIN_EMAILS.includes(email) || SUPER_ADMIN_PHONES.includes(phone);
      const [rolesRes, permsRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        (supabase as any)
          .from("user_permissions")
          .select("module,action,allow,resource,can_view,can_create,can_edit,can_delete,can_publish")
          .eq("user_id", user.id),
      ]);
      const dbRoles = (rolesRes.data ?? []).map((r: any) => r.role as AppRole);
      const all = isSuper ? Array.from(new Set<AppRole>(["admin", ...dbRoles])) : dbRoles;
      const g = new Set<string>();
      (permsRes.data ?? []).forEach((p: any) => {
        // Legacy module/action/allow rows
        if (p.allow && p.module && p.action) g.add(`${p.module}:${p.action}`);
        // Resource-based rows
        if (p.resource) {
          if (p.can_view) g.add(`${p.resource}:view`);
          if (p.can_create) g.add(`${p.resource}:create`);
          if (p.can_edit) { g.add(`${p.resource}:edit`); g.add(`${p.resource}:edit_own`); }
          if (p.can_delete) g.add(`${p.resource}:delete`);
          if (p.can_publish) g.add(`${p.resource}:publish`);
        }
      });
      setRoles(all);
      setGrants(g);
      setIsAdmin(all.includes("admin"));
    } catch {
      setRoles([]); setGrants(new Set()); setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          setIsLoading(true);
          // Defer Supabase calls to avoid deadlock inside the auth callback
          setTimeout(() => {
            loadRoles(newSession.user).finally(() => setIsLoading(false));
          }, 0);
        } else {
          setRoles([]); setGrants(new Set()); setIsAdmin(false);
          setIsLoading(false);
        }
      }
    );
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession?.user) await loadRoles(initialSession.user);
      else { setRoles([]); setIsAdmin(false); }
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [loadRoles]);


  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null); setIsAdmin(false); setRoles([]);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAdmin,
        roles,
        isLoading,
        can: (m, a) => isAdmin || grants.has(`${m}:${a}`) || can(roles, m, a),
        canAccess: (m) => isAdmin || Array.from(grants).some(k => k.startsWith(`${m}:`)) || canAccessModule(roles, m),
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
