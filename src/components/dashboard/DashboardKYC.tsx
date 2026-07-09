import { useState, useEffect, useRef } from "react";
import { useProfile, useUpdateProfile, useUploadDocument, useUserDocuments } from "@/hooks/useDashboardData";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Upload, Lock, AlertTriangle, CheckCircle, Camera, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStatesAndCities } from "@/hooks/useLocations";
import { normalizeIndianMobile } from "@/lib/phone";

const CURRENT_STATUS_OPTIONS = ["Student", "Working", "Business", "Doing Nothing", "Others"];
const EDUCATION_LEVELS = ["10", "12", "Graduate", "Post Graduate", "PhD"];

export function DashboardKYC({ onComplete }: { onComplete?: () => void }) {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { data: documents } = useUserDocuments();
  const updateProfile = useUpdateProfile();
  const uploadDoc = useUploadDocument();
  const { data: locations } = useStatesAndCities();
  const profileImgRef = useRef<HTMLInputElement>(null);
  const aadhaarRef = useRef<HTMLInputElement>(null);
  const panRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    display_name: "",
    email: "",
    phone: "",
    state: "",
    city: "",
    gender: "",
    current_status: "",
    education_level: "",
    other_status: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name || "",
        email: profile.email || user?.email || "",
        phone: profile.phone || user?.phone || "",
        state: profile.state || "",
        city: profile.city || "",
        gender: profile.gender || "",
        current_status: (profile as any).current_status || "",
        education_level: (profile as any).education_level || "",
        other_status: "",
      });
    }
  }, [profile, user]);

  const hasAadhaar = documents?.some(d => d.doc_type === "aadhaar");
  const hasPan = documents?.some(d => d.doc_type === "pan");
  const hasProfileImg = documents?.some(d => d.doc_type === "profile_image");

  const isKycComplete = !!(
    form.display_name && form.email && form.phone &&
    form.state && form.city && form.gender &&
    (form.current_status || form.other_status) &&
    form.education_level &&
    hasAadhaar && hasPan && hasProfileImg
  );

  const handleUpload = async (file: File, docType: string) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, PDF allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be under 2MB");
      return;
    }
    await uploadDoc.mutateAsync({ file, docType });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.display_name || !form.email || !form.phone || !form.state || !form.city || !form.gender || !form.education_level) {
      toast.error("Please fill all required fields");
      return;
    }
    const status = form.current_status === "Others" ? form.other_status : form.current_status;
    if (!status) {
      toast.error("Please select your current status");
      return;
    }
    if (!hasAadhaar || !hasPan || !hasProfileImg) {
      toast.error("Please upload all required documents (Profile Image, Aadhaar, PAN)");
      return;
    }

    await updateProfile.mutateAsync({
      display_name: form.display_name,
      email: form.email,
      phone: form.phone,
      state: form.state,
      city: form.city,
      gender: form.gender,
      current_status: status,
      education_level: form.education_level,
      kyc_completed: true,
      kyc_completed_at: new Date().toISOString(),
    });
    toast.success("KYC completed! You can now access Refer & Earn 🎉");
    onComplete?.();
  };

  if (isLoading) return <div className="bg-card rounded-xl border border-border p-8 animate-pulse h-96" />;

  if ((profile as any)?.kyc_completed) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">KYC Verified</h3>
        <p className="text-muted-foreground">Your identity has been verified. You have full access to Refer & Earn.</p>
        <Button onClick={onComplete} className="mt-4 rounded-xl">Go to Refer & Earn</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Complete KYC to unlock Refer & Earn</p>
          <p className="text-xs text-amber-700 mt-1">All fields and documents are mandatory. Once Aadhaar/PAN is uploaded, it cannot be changed by you.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-6">
        <h3 className="text-lg font-bold text-foreground">KYC Verification</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Full Name *</Label>
            <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} required className="rounded-lg" />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required className="rounded-lg" />
          </div>
          <div>
            <Label>Mobile *</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: normalizeIndianMobile(e.target.value) }))} required className="rounded-lg" placeholder="10-digit number" />
          </div>
          <div>
            <Label>State *</Label>
            <Select value={form.state} onValueChange={v => setForm(f => ({ ...f, state: v }))}>
              <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select State" /></SelectTrigger>
              <SelectContent>
                {(locations?.states || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>City *</Label>
            <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required className="rounded-lg" />
          </div>
          <div>
            <Label>Gender *</Label>
            <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
              <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Current Status *</Label>
            <Select value={form.current_status} onValueChange={v => setForm(f => ({ ...f, current_status: v }))}>
              <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {CURRENT_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {form.current_status === "Others" && (
            <div>
              <Label>Specify Status *</Label>
              <Input value={form.other_status} onChange={e => setForm(f => ({ ...f, other_status: e.target.value }))} className="rounded-lg" placeholder="What are you doing?" />
            </div>
          )}
          <div>
            <Label>Education Level *</Label>
            <Select value={form.education_level} onValueChange={v => setForm(f => ({ ...f, education_level: v }))}>
              <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Document uploads */}
        <div>
          <h4 className="font-semibold text-foreground mb-3">Required Documents</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Profile Image */}
            <div className="rounded-xl border border-border p-4 text-center">
              {hasProfileImg ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <p className="text-sm font-medium text-foreground">Profile Image</p>
                  <Badge variant="secondary">Uploaded</Badge>
                </div>
              ) : (
                <button type="button" onClick={() => profileImgRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Profile Image *</p>
                  <p className="text-xs text-muted-foreground">JPG/PNG, max 2MB</p>
                </button>
              )}
              <input ref={profileImgRef} type="file" accept=".jpg,.jpeg,.png" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, "profile_image"); e.target.value = ""; }} />
            </div>

            {/* Aadhaar */}
            <div className="rounded-xl border border-border p-4 text-center">
              {hasAadhaar ? (
                <div className="flex flex-col items-center gap-2">
                  <Lock className="w-8 h-8 text-amber-500" />
                  <p className="text-sm font-medium text-foreground">Aadhaar Card</p>
                  <Badge variant="secondary">Uploaded & Locked</Badge>
                  <p className="text-[10px] text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Cannot be changed</p>
                </div>
              ) : (
                <button type="button" onClick={() => aadhaarRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 cursor-pointer">
                  <Upload className="w-8 h-8 text-primary/50" />
                  <p className="text-sm font-medium text-foreground">Aadhaar Card *</p>
                  <p className="text-xs text-muted-foreground">JPG/PNG/PDF, max 2MB</p>
                </button>
              )}
              <input ref={aadhaarRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, "aadhaar"); e.target.value = ""; }} />
            </div>

            {/* PAN */}
            <div className="rounded-xl border border-border p-4 text-center">
              {hasPan ? (
                <div className="flex flex-col items-center gap-2">
                  <Lock className="w-8 h-8 text-amber-500" />
                  <p className="text-sm font-medium text-foreground">PAN Card</p>
                  <Badge variant="secondary">Uploaded & Locked</Badge>
                  <p className="text-[10px] text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Cannot be changed</p>
                </div>
              ) : (
                <button type="button" onClick={() => panRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 cursor-pointer">
                  <Upload className="w-8 h-8 text-primary/50" />
                  <p className="text-sm font-medium text-foreground">PAN Card *</p>
                  <p className="text-xs text-muted-foreground">JPG/PNG/PDF, max 2MB</p>
                </button>
              )}
              <input ref={panRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, "pan"); e.target.value = ""; }} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <HelpCircle className="w-3 h-3" /> Need help? Contact support to raise an admin request for document changes.
          </p>
        </div>

        <Button type="submit" disabled={updateProfile.isPending} className="rounded-xl gradient-primary text-primary-foreground w-full h-12 text-base font-semibold">
          {updateProfile.isPending ? "Submitting..." : "Complete KYC Verification"}
        </Button>
      </form>
    </div>
  );
}
