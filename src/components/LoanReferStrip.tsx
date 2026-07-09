import { Link } from "react-router-dom";
import { Banknote, Gift, ArrowRight } from "lucide-react";

export function LoanReferStrip() {
  return (
    <section className="py-3" aria-label="Loans and referrals">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Link
          to="/tools/education-loan"
          className="group flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 hover:bg-primary/10 hover:border-primary/40 transition"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
            <Banknote className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground leading-tight">Cheapest Education Loans</p>
            <p className="text-[11px] text-muted-foreground truncate">From govt. banks - lowest interest rates.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition" />
        </Link>

        <Link
          to="/dashboard/refer-earn"
          className="group flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/5 px-3.5 py-2.5 hover:bg-accent/10 hover:border-accent/40 transition"
        >
          <div className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
            <Gift className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground leading-tight">Refer & Earn</p>
            <p className="text-[11px] text-muted-foreground truncate">Invite friends - earn cash rewards</p>
          </div>
          <ArrowRight className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition" />
        </Link>
      </div>
    </section>
  );
}
