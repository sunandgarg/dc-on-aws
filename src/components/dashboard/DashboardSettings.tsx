import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useDashboardData";
import { Label } from "@/components/ui/label";
import { Phone, Mail, Hash, ShieldCheck } from "lucide-react";

function genAccountId(seed: string) {
  // Stable pseudo-random suffix from user_id
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h) + seed.charCodeAt(i);
  const suffix = Math.abs(h).toString(36).toUpperCase().slice(0, 5);
  return suffix;
}

export function DashboardSettings() {
  const { user } = useAuth();
  const { data: profile } = useProfile() as any;

  const phone = profile?.phone || user?.user_metadata?.phone || "";
  const email = user?.email && !user.email.endsWith("@dekhocampus.local") ? user.email : "";
  const isGoogleUser = !phone && !!email;

  const accountId = phone
    ? `${phone}-DC-${genAccountId(user?.id || "")}`
    : `DC-${genAccountId(user?.id || "x")}`;

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Account Settings
        </h3>

        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-muted-foreground mt-1" />
            <div className="flex-1">
              <Label className="text-muted-foreground text-xs">Mobile Number</Label>
              <p className="font-semibold text-foreground text-base">
                {phone ? `+91 ${phone}` : <span className="text-muted-foreground italic text-sm">Not linked (Google login)</span>}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-muted-foreground mt-1" />
            <div className="flex-1">
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="font-medium text-foreground text-sm">
                {email || <span className="text-muted-foreground italic">Not linked</span>}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Hash className="w-4 h-4 text-muted-foreground mt-1" />
            <div className="flex-1">
              <Label className="text-muted-foreground text-xs">Account ID</Label>
              <p className="font-mono text-sm text-foreground bg-muted px-2 py-1 rounded inline-block mt-0.5">{accountId}</p>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              {isGoogleUser
                ? "You're signed in with Google. To link a mobile number, sign out and sign in via OTP next time."
                : "You're signed in via Mobile OTP. Your sessions stay active for 6 months."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
