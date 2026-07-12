import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { 
  Home, User, Gift, FileText, Settings, LogOut, ShieldCheck, GraduationCap, Users, Heart, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { DashboardProfile } from "@/components/dashboard/DashboardProfile";
import { DashboardReferEarn } from "@/components/dashboard/DashboardReferEarn";
import { DashboardDocuments } from "@/components/dashboard/DashboardDocuments";
import { DashboardSettings } from "@/components/dashboard/DashboardSettings";
import { DashboardKYC } from "@/components/dashboard/DashboardKYC";
import { DashboardApplications } from "@/components/dashboard/DashboardApplications";
import { DashboardSubUsers } from "@/components/dashboard/DashboardSubUsers";
import { DashboardFavorites } from "@/components/dashboard/DashboardFavorites";
import { DashboardTargets } from "@/components/dashboard/DashboardTargets";
import { isSyntheticPhoneEmail } from "@/lib/authIdentity";

const ALL_TABS = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "favourites", label: "Favourites", icon: Heart },
  { id: "targets", label: "Target Dashboard", icon: Target },
  { id: "applications", label: "My Applications", icon: GraduationCap },
  { id: "profile", label: "My Profile", icon: User },
  { id: "kyc", label: "KYC Verification", icon: ShieldCheck },
  { id: "refer", label: "Refer & Earn", icon: Gift },
  { id: "sub-users", label: "Sub-users", icon: Users },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

// Authors (linked via authors.user_id) only see profile-relevant tabs
const AUTHOR_TABS = ["dashboard", "favourites", "profile", "documents", "settings"];

export default function UserDashboard() {
  const { user, isLoading, isAdmin, signOut } = useAuth();
  const { data: profile } = useProfile();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLinkedAuthor, setIsLinkedAuthor] = useState(false);

  useEffect(() => {
    if (!user) return;
    (supabase as any).from("authors").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }: any) => setIsLinkedAuthor(!!data));
  }, [user]);

  const tabs = (!isAdmin && isLinkedAuthor)
    ? ALL_TABS.filter((t) => AUTHOR_TABS.includes(t.id))
    : ALL_TABS;

  const isKycComplete = !!(profile as any)?.kyc_completed;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  // Force first-time onboarding
  if (profile && (profile as any).onboarding_completed === false) {
    return <Navigate to="/onboarding" replace />;
  }

  const profileAny = profile as any;
  const rawName: string =
    profileAny?.display_name ||
    (user.user_metadata as any)?.display_name ||
    (user.user_metadata as any)?.full_name ||
    "";
  const emailLocal = user.email && !isSyntheticPhoneEmail(user.email)
    ? user.email.split("@")[0]
    : "";
  const hasName = !!rawName.trim();
  const displayName = hasName ? rawName.trim() : (emailLocal || "there");
  const initials = hasName
    ? rawName.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("")
    : (emailLocal ? emailLocal.charAt(0).toUpperCase() : "U");
  const avatarUrl: string = profileAny?.profile_image_url || "";

  // KYC is no longer required to refer; it's only required to withdraw earnings.
  const effectiveTab = activeTab;

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      
      <div className="bg-primary text-primary-foreground">
        <div className="container py-6 md:py-8 flex items-center gap-4">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary-foreground/20 border-2 border-primary-foreground/40 flex items-center justify-center text-2xl md:text-3xl font-bold overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Welcome, {displayName}</h1>
            <div className="flex items-center gap-3 mt-1">
              <button onClick={() => setActiveTab("profile")} className="text-sm text-primary-foreground/80 hover:text-primary-foreground underline">
                Manage your Profile
              </button>
              {isKycComplete ? (
                <span className="inline-flex items-center gap-1 text-xs bg-primary-foreground/20 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" /> KYC Verified
                </span>
              ) : (
                <button onClick={() => setActiveTab("kyc")} className="inline-flex items-center gap-1 text-xs bg-amber-400/20 text-amber-100 px-2 py-0.5 rounded-full hover:bg-amber-400/30 transition-colors">
                  <ShieldCheck className="w-3 h-3" /> Complete KYC
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="bg-card rounded-xl border border-border p-2 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                    effectiveTab === tab.id
                      ? "bg-primary/10 text-primary border-l-3 border-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
              <div className="border-t border-border my-2" />
              <button
                onClick={signOut}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </nav>
          </aside>

          <main className="flex-1 min-w-0">
            {effectiveTab === "dashboard" && <DashboardHome onNavigate={setActiveTab} />}
            {effectiveTab === "favourites" && <DashboardFavorites />}
            {effectiveTab === "targets" && <DashboardTargets />}
            {effectiveTab === "applications" && <DashboardApplications />}
            {effectiveTab === "profile" && <DashboardProfile />}
            {effectiveTab === "kyc" && <DashboardKYC onComplete={() => setActiveTab("refer")} />}
            {effectiveTab === "refer" && <DashboardReferEarn />}
            {effectiveTab === "sub-users" && <DashboardSubUsers />}
            {effectiveTab === "documents" && <DashboardDocuments />}
            {effectiveTab === "settings" && <DashboardSettings />}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
