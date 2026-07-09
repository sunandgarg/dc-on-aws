import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { AlertCircle, X } from "lucide-react";
import { useState } from "react";

export function ProfileCompletionBanner() {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const [dismissed, setDismissed] = useState(false);

  if (!user || !profile || dismissed) return null;

  const missing: string[] = [];
  if (!profile.name) missing.push("Name");
  if (!profile.email) missing.push("Email");
  if (!profile.state) missing.push("State");
  if (!profile.city) missing.push("City");

  if (missing.length === 0) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-foreground min-w-0">
          <AlertCircle className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="truncate">
            Complete your profile ({missing.join(", ")} missing) for personalized recommendations.
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link to="/dashboard/settings" className="text-xs font-semibold text-primary hover:underline whitespace-nowrap">
            Complete now →
          </Link>
          <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
