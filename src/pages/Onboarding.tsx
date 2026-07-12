import { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Camera, Upload } from "lucide-react";
import { isStrictIndianMobile, normalizeIndianMobile } from "@/lib/phone";
import { isSyntheticPhoneEmail } from "@/lib/authIdentity";

const EDU_OPTIONS = [
  "Class 12 - Appearing",
  "Class 12 - Passed",
  "Graduation - Appearing",
  "Graduation - Passed",
  "Post-Graduation - Appearing",
  "Post-Graduation - Completed",
];

export default function Onboarding() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    display_name: "",
    email: "",
    phone: "",
    education_status: "",
    class_12_percentage: "",
    profile_image_url: "",
  });

  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (!user?.id || prefilled) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, email, phone, education_status, class_12_percentage, profile_image_url, onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if ((data as any)?.onboarding_completed) {
        navigate("/dashboard?tab=profile", { replace: true });
        return;
      }
      const rawEmail = data?.email || user.email || "";
      const isOtpSynthetic = isSyntheticPhoneEmail(rawEmail);
      setForm((f) => ({
        ...f,
        display_name: data?.display_name || (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.display_name || "",
        email: isOtpSynthetic ? "" : rawEmail,
        phone: data?.phone || (user.user_metadata as any)?.phone || "",
        education_status: (data as any)?.education_status || "",
        class_12_percentage: (data as any)?.class_12_percentage || "",
        profile_image_url: (data as any)?.profile_image_url || "",
      }));
      setPrefilled(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id, prefilled, navigate]);

  if (!isLoading && !user) return <Navigate to="/auth" replace />;

  const userEmail = user?.email || "";
  const isOtpUser = !!user?.phone || isSyntheticPhoneEmail(userEmail);
  const isGoogleUser = !!userEmail && !isSyntheticPhoneEmail(userEmail) && !isOtpUser;
  const lockPhone = isOtpUser && !!form.phone;
  const lockEmail = isGoogleUser && !!form.email;

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const askPercentage = /Class 12/i.test(form.education_status);

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id) return;
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 3 MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `user-avatars/${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("admin-uploads").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("admin-uploads").getPublicUrl(path);
      update("profile_image_url", data.publicUrl);
      toast({ title: "Photo uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!form.display_name.trim()) {
      toast({ title: "Please enter the student name", variant: "destructive" }); return;
    }
    if (!isStrictIndianMobile(form.phone)) {
      toast({ title: "Enter a valid 10-digit mobile number", variant: "destructive" }); return;
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast({ title: "Enter a valid email", variant: "destructive" }); return;
    }
    if (!form.education_status) {
      toast({ title: "Please select your education status", variant: "destructive" }); return;
    }
    if (askPercentage && !form.class_12_percentage.trim()) {
      toast({ title: "Please enter your Class 12 percentage", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        user_id: user!.id,
        display_name: form.display_name.trim(),
        email: form.email.trim(),
        phone: normalizeIndianMobile(form.phone),
        education_status: form.education_status,
        profile_image_url: form.profile_image_url || "",
        onboarding_completed: true,
      };
      if (askPercentage) payload.class_12_percentage = form.class_12_percentage.trim();

      const { error } = await supabase.from("profiles").update(payload).eq("user_id", user!.id);
      if (error) throw error;
      const { data: check } = await supabase.from("profiles").select("user_id").eq("user_id", user!.id).maybeSingle();
      if (!check) {
        const { error: insErr } = await supabase.from("profiles").insert(payload);
        if (insErr) throw insErr;
      }
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.refetchQueries({ queryKey: ["profile", user!.id] });
      setDone(true);
      setTimeout(() => navigate("/dashboard?tab=profile", { replace: true }), 700);
    } catch (e: any) {
      toast({ title: "Could not save", description: e?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const initial = (form.display_name || "U").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8 md:py-12">
        <div className="max-w-xl mx-auto">
          <div className="mb-6 text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {done ? "All set 🎉" : "Tell us a bit about you"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Takes less than a minute</p>
          </div>

          {done ? (
            <div className="bg-card border border-border rounded-3xl p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <p className="text-foreground font-semibold">Profile saved. Redirecting to My Profile…</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-3xl p-6 md:p-7 space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-2 pb-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-3xl font-bold text-primary overflow-hidden group"
                >
                  {form.profile_image_url ? (
                    <img src={form.profile_image_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    initial
                  )}
                  <span className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-6 h-6 text-background" />
                  </span>
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-xs text-primary font-medium inline-flex items-center gap-1">
                  {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</> : <><Upload className="w-3 h-3" /> {form.profile_image_url ? "Change photo" : "Upload photo (optional)"}</>}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Student name *</Label>
                <Input value={form.display_name} onChange={(e) => update("display_name", e.target.value)} className="h-11 rounded-xl" placeholder="Full name of the student" />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => !lockEmail && update("email", e.target.value)}
                  readOnly={lockEmail}
                  disabled={lockEmail}
                  className={`h-11 rounded-xl ${lockEmail ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}`}
                  placeholder="you@example.com"
                />
                {lockEmail && <p className="text-[11px] text-muted-foreground">Linked to your Google account</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Mobile number *</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => !lockPhone && update("phone", normalizeIndianMobile(e.target.value))}
                  readOnly={lockPhone}
                  disabled={lockPhone}
                  className={`h-11 rounded-xl ${lockPhone ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}`}
                  placeholder="9876543210"
                />
                {lockPhone && <p className="text-[11px] text-muted-foreground">Verified via OTP - cannot be changed</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Current education status *</Label>
                <Select value={form.education_status} onValueChange={(v) => update("education_status", v)}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {EDU_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {askPercentage && (
                <div className="space-y-1.5">
                  <Label>Class 12 percentage *</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={form.class_12_percentage}
                    onChange={(e) => update("class_12_percentage", e.target.value.replace(/[^0-9.]/g, "").slice(0, 5))}
                    className="h-11 rounded-xl"
                    placeholder="e.g. 87.5"
                  />
                  <p className="text-[11px] text-muted-foreground">If appearing, enter your expected percentage.</p>
                </div>
              )}

              <Button onClick={submit} disabled={submitting} className="w-full h-11 rounded-xl text-base">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finish & Go to My Profile"}
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
