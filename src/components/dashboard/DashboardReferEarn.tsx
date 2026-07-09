import { useState } from "react";
import { useReferrals, useCreateReferral, useWalletBalance, useProfile } from "@/hooks/useDashboardData";
import { useDbColleges } from "@/hooks/useCollegesData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Gift, Plus, Trash2, Star, Search, CheckCircle, Clock, Phone, IndianRupee, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useStatesAndCities } from "@/hooks/useLocations";
import { Link } from "react-router-dom";
import { normalizeIndianMobile } from "@/lib/phone";

type CollegeEntry = { name: string; slug: string };

const emptyForm = {
  friend_name: "",
  friend_mobile: "",
  friend_email: "",
  alternate_mobile: "",
  alternate_email: "",
  friend_state: "",
  friend_city: "",
  desired_city: "",
};

export function DashboardReferEarn() {
  const { data: referrals, isLoading } = useReferrals();
  const { data: balance } = useWalletBalance();
  const { data: colleges } = useDbColleges();
  const { data: profile } = useProfile();
  const isKycComplete = !!(profile as any)?.kyc_completed;
  const createReferral = useCreateReferral();
  const { data: locations } = useStatesAndCities();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedColleges, setSelectedColleges] = useState<CollegeEntry[]>([]);
  const [collegeSearch, setCollegeSearch] = useState("");
  const [otherCollege, setOtherCollege] = useState("");
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);

  const filteredColleges = (colleges ?? []).filter(c =>
    c.name.toLowerCase().includes(collegeSearch.toLowerCase())
  ).slice(0, 8);

  const addCollege = (name: string, slug: string) => {
    if (selectedColleges.find(c => c.slug === slug)) return;
    setSelectedColleges(prev => [...prev, { name, slug }]);
    setCollegeSearch("");
    setShowCollegeDropdown(false);
  };

  const addOtherCollege = () => {
    if (!otherCollege.trim()) return;
    addCollege(otherCollege.trim(), `other-${Date.now()}`);
    setOtherCollege("");
  };

  const removeCollege = (slug: string) => {
    setSelectedColleges(prev => prev.filter(c => c.slug !== slug));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.friend_name || !form.friend_mobile || !form.friend_email || !form.friend_state || !form.friend_city) {
      toast.error("Please fill all mandatory fields");
      return;
    }
    if (!/^\d{10}$/.test(form.friend_mobile)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    await createReferral.mutateAsync({
      ...form,
      desired_colleges: selectedColleges,
    });
    setForm(emptyForm);
    setSelectedColleges([]);
    setShowForm(false);
  };

  const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    submitted: { color: "bg-blue-100 text-blue-700", icon: Clock, label: "Submitted" },
    contacted: { color: "bg-amber-100 text-amber-700", icon: Phone, label: "Contacted" },
    converted: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Converted" },
    paid: { color: "bg-purple-100 text-purple-700", icon: IndianRupee, label: "Paid" },
  };

  return (
    <div className="space-y-6">
      {/* Wallet summary */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Star className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm opacity-90">Your Earnings</p>
            <p className="text-3xl font-bold">₹{balance ?? 0}</p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 rounded-xl"
        >
          <Gift className="w-4 h-4 mr-2" />
          Refer a Friend
        </Button>
      </div>

      {/* KYC notice - required only for withdrawal */}
      {!isKycComplete && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4">
          <ShieldCheck className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">KYC required to withdraw earnings</p>
            <p className="text-xs text-amber-800 dark:text-amber-200 mt-0.5">
              You can refer friends right away. To <b>cash out</b> your rewards, complete your KYC verification.
            </p>
          </div>
          <Link to="/dashboard?tab=kyc">
            <Button size="sm" variant="outline" className="rounded-lg border-amber-300 text-amber-900 hover:bg-amber-100">Complete KYC</Button>
          </Link>
        </div>
      )}

      {/* Referral form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-5">
          <h3 className="text-lg font-bold text-foreground">Refer a Friend</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Friend Name *</Label>
              <Input value={form.friend_name} onChange={e => setForm(f => ({ ...f, friend_name: e.target.value }))} required className="rounded-lg" />
            </div>
            <div>
              <Label>Mobile *</Label>
              <Input value={form.friend_mobile} onChange={e => setForm(f => ({ ...f, friend_mobile: normalizeIndianMobile(e.target.value) }))} required className="rounded-lg" placeholder="10-digit number" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.friend_email} onChange={e => setForm(f => ({ ...f, friend_email: e.target.value }))} required className="rounded-lg" />
            </div>
            <div>
              <Label>Alternate Mobile</Label>
              <Input value={form.alternate_mobile} onChange={e => setForm(f => ({ ...f, alternate_mobile: normalizeIndianMobile(e.target.value) }))} className="rounded-lg" />
            </div>
            <div>
              <Label>Alternate Email</Label>
              <Input type="email" value={form.alternate_email} onChange={e => setForm(f => ({ ...f, alternate_email: e.target.value }))} className="rounded-lg" />
            </div>
            <div>
              <Label>State *</Label>
              <Select value={form.friend_state} onValueChange={v => setForm(f => ({ ...f, friend_state: v }))}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select State" /></SelectTrigger>
                <SelectContent>
                  {(locations?.states || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>City *</Label>
              <Input value={form.friend_city} onChange={e => setForm(f => ({ ...f, friend_city: e.target.value }))} required className="rounded-lg" />
            </div>
            <div>
              <Label>Desired City</Label>
              <Input value={form.desired_city} onChange={e => setForm(f => ({ ...f, desired_city: e.target.value }))} className="rounded-lg" />
            </div>
          </div>

          {/* College search */}
          <div>
            <Label>Desired Colleges</Label>
            <div className="relative mt-1">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={collegeSearch}
                    onChange={e => { setCollegeSearch(e.target.value); setShowCollegeDropdown(true); }}
                    onFocus={() => setShowCollegeDropdown(true)}
                    placeholder="Search colleges..."
                    className="pl-10 rounded-lg"
                  />
                  {showCollegeDropdown && collegeSearch && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => { setOtherCollege(collegeSearch); setCollegeSearch(""); setShowCollegeDropdown(false); }}
                        className="w-full px-4 py-2 text-left text-sm font-medium text-primary hover:bg-muted border-b border-border"
                      >
                        + Other: "{collegeSearch}"
                      </button>
                      {filteredColleges.map(c => (
                        <button
                          key={c.slug}
                          type="button"
                          onClick={() => addCollege(c.name, c.slug)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                        >
                          {c.name}
                          <span className="text-xs text-muted-foreground ml-2">{c.location}</span>
                        </button>
                      ))}
                      {filteredColleges.length === 0 && (
                        <p className="px-4 py-2 text-sm text-muted-foreground">No colleges found</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Other college input */}
            {otherCollege && (
              <div className="flex gap-2 mt-2">
                <Input value={otherCollege} onChange={e => setOtherCollege(e.target.value)} placeholder="Type college name" className="rounded-lg" />
                <Button type="button" size="sm" onClick={addOtherCollege} className="rounded-lg">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Selected colleges */}
            {selectedColleges.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedColleges.map(c => (
                  <Badge key={c.slug} variant="secondary" className="flex items-center gap-1 pr-1">
                    {c.name}
                    <button type="button" onClick={() => removeCollege(c.slug)} className="ml-1 hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={createReferral.isPending} className="rounded-xl gradient-primary text-primary-foreground">
              {createReferral.isPending ? "Submitting..." : "Submit Referral"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Referral list */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Your Referrals ({referrals?.length ?? 0})</h3>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : !referrals?.length ? (
          <div className="p-8 text-center">
            <Gift className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No referrals yet. Refer a friend to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {referrals.map(r => {
              const cfg = statusConfig[r.status] || statusConfig.submitted;
              return (
                <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{r.friend_name}</p>
                    <p className="text-sm text-muted-foreground">{r.friend_mobile} • {r.friend_email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.friend_city}, {r.friend_state} • {new Date(r.created_at).toLocaleDateString()}
                    </p>
                    {r.desired_colleges?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.desired_colleges.map((c, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{c.name}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {r.reward_amount > 0 && (
                      <span className="text-sm font-medium text-green-600">₹{r.reward_amount}</span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                      <cfg.icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
