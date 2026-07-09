import { useAuth } from "@/hooks/useAuth";
import { useReferrals, useWalletBalance, useProfile } from "@/hooks/useDashboardData";
import { Gift, FileText, User, TrendingUp, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onNavigate: (tab: string) => void;
}

export function DashboardHome({ onNavigate }: Props) {
  const { user } = useAuth();
  const { data: referrals } = useReferrals();
  const { data: balance } = useWalletBalance();
  const { data: profile } = useProfile();

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";
  
  // Calculate profile completion
  const profileFields = [
    profile?.display_name, profile?.phone, profile?.dob, profile?.gender,
    profile?.city, profile?.state, profile?.class_10_board, profile?.class_12_board,
  ];
  const filledFields = profileFields.filter(Boolean).length;
  const completionPct = Math.round((filledFields / profileFields.length) * 100);

  const totalReferrals = referrals?.length ?? 0;
  const convertedReferrals = referrals?.filter(r => r.status === "converted").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Star className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Wallet Balance</p>
            <p className="text-2xl font-bold text-foreground">₹{balance ?? 0}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <Gift className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Referrals</p>
            <p className="text-2xl font-bold text-foreground">{totalReferrals}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Converted</p>
            <p className="text-2xl font-bold text-foreground">{convertedReferrals}</p>
          </div>
        </div>
      </div>

      {/* Profile completion nudge */}
      {completionPct < 100 && (
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Complete your profile</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Update your profile for better college recommendations and earn reward points.
            </p>
            <div className="mt-3 w-full max-w-xs bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{completionPct}% Completed</p>
          </div>
          <Button onClick={() => onNavigate("profile")} className="rounded-xl">
            Complete Profile
          </Button>
        </div>
      )}

      {/* Refer CTA */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground text-lg">Refer a Friend & Earn Rewards! 🎁</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Share DekhoCampus with friends and earn money for every successful admission.
          </p>
        </div>
        <Button onClick={() => onNavigate("refer")} className="rounded-xl gradient-primary text-primary-foreground">
          Refer Now
        </Button>
      </div>

      {/* Upload docs CTA */}
      <div className="bg-card rounded-xl border border-border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Upload Documents</h3>
            <p className="text-sm text-muted-foreground">Securely store your certificates for quick access.</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => onNavigate("documents")} className="rounded-xl">
          Upload Now
        </Button>
      </div>
    </div>
  );
}
