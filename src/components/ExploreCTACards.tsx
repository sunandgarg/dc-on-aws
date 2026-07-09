import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, IndianRupee, CreditCard, Gift } from "lucide-react";
import { motion } from "framer-motion";
import { LeadGateDialog } from "@/components/LeadGateDialog";

export function ExploreCTACards() {
  const [showLeadForm, setShowLeadForm] = useState(false);
  const navigate = useNavigate();

  return (
    <section className="py-3" aria-label="Quick Actions">
      <div className="grid grid-cols-2 gap-3 items-stretch">
        {/* Education Loan CTA - opens lead form first */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="h-full">
          <button
            onClick={() => setShowLeadForm(true)}
            className="flex flex-col justify-between w-full h-full text-left bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/30 border border-blue-200/60 dark:border-blue-800/40 rounded-xl p-3 hover:shadow-md transition-all group min-h-[92px]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-xs group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors leading-tight">
                  Cheapest Education Loan
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                  Fast approval • Student friendly
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-[9px] font-semibold w-fit">
              <CreditCard className="w-2.5 h-2.5" /> Apply Student Credit Card
            </span>
          </button>
        </motion.div>

        {/* Refer & Earn CTA - goes directly to login/dashboard */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="h-full">
          <Link
            to="/dashboard?tab=refer"
            className="flex flex-col justify-between h-full bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl p-3 hover:shadow-md transition-all group min-h-[92px]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-xs group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                  🇮🇳 ₹ Refer & Earn
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                  Help a friend. Earn real money.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full text-[9px] font-semibold w-fit">
              <Gift className="w-2.5 h-2.5" /> Start Referring
            </span>
          </Link>
        </motion.div>
      </div>

      <LeadGateDialog
        open={showLeadForm}
        onOpenChange={setShowLeadForm}
        title="🎓 Apply for Education Loan"
        subtitle="Fill the form & get the cheapest loan options!"
        source="education_loan_cta"
        onSuccess={() => {
          setShowLeadForm(false);
          navigate("/auth?redirect=/dashboard");
        }}
      />
    </section>
  );
}
