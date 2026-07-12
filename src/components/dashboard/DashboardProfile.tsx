import { useState, useEffect, useRef } from "react";
import { useProfile, useUpdateProfile } from "@/hooks/useDashboardData";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Loader2, Lock, Gift, Camera, Upload } from "lucide-react";
import { useStatesAndCities } from "@/hooks/useLocations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HigherEducationSection } from "@/components/dashboard/HigherEducationSection";
import { isSyntheticPhoneEmail } from "@/lib/authIdentity";

const EDU_OPTIONS = [
  "Class 12 - Appearing", "Class 12 - Passed",
  "Graduation - Appearing", "Graduation - Passed",
  "Post-Graduation - Appearing", "Post-Graduation - Completed",
];

type FieldType = "text" | "select" | "date";

interface FieldProps {
  label: string;
  value: any;
  onSave: (val: any) => Promise<void>;
  type?: FieldType;
  options?: string[];
  locked?: boolean;
  lockedHint?: string;
}

function InlineField({ label, value, onSave, type = "text", options, locked, lockedHint }: FieldProps) {
  const [draft, setDraft] = useState<any>(value ?? "");
  const [saving, setSaving] = useState(false);
  const original = useRef<any>(value ?? "");

  useEffect(() => { setDraft(value ?? ""); original.current = value ?? ""; }, [value]);

  const dirty = String(draft ?? "") !== String(original.current ?? "");

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(draft); original.current = draft; } finally { setSaving(false); }
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
        {label} {locked && <Lock className="w-3 h-3 text-muted-foreground" />}
      </p>
      <div className="flex items-center gap-2">
        {type === "select" ? (
          <Select value={String(draft || "")} onValueChange={setDraft} disabled={locked}>
            <SelectTrigger className="rounded-lg h-9"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {(options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={type === "date" ? "date" : "text"}
            value={draft || ""}
            onChange={(e) => !locked && setDraft(e.target.value)}
            readOnly={locked}
            disabled={locked}
            className={`rounded-lg h-9 ${locked ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}`}
          />
        )}
        {dirty && !locked && (
          <div className="flex gap-1 shrink-0">
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-9 rounded-lg px-3">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Save</>}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(original.current)} className="h-9 rounded-lg px-2">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      {locked && lockedHint && <p className="text-[10px] text-muted-foreground mt-1">{lockedHint}</p>}
    </div>
  );
}


export function DashboardProfile() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: locations } = useStatesAndCities();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (isLoading) return <div className="bg-card rounded-xl border border-border p-8 animate-pulse h-96" />;

  const save = (key: string) => async (val: any) => {
    await updateProfile.mutateAsync({ [key]: val ?? "" });
  };

  const profileAny = profile as any;
  const stateValue = profileAny?.state || "";
  const cityOptions = ((locations?.citiesByState as any)?.[stateValue] || []) as string[];

  const userEmail = user?.email || "";
  const isOtpUser = !!user?.phone || isSyntheticPhoneEmail(userEmail);
  const lockPhone = isOtpUser && !!profileAny?.phone;

  // Completion: weighted set of important fields
  const completionFields: { key: string; weight: number }[] = [
    { key: "display_name", weight: 10 },
    { key: "email", weight: 10 },
    { key: "phone", weight: 10 },
    { key: "profile_image_url", weight: 8 },
    { key: "dob", weight: 5 },
    { key: "gender", weight: 5 },
    { key: "state", weight: 6 },
    { key: "city", weight: 6 },
    { key: "education_status", weight: 8 },
    { key: "class_10_board", weight: 4 },
    { key: "class_10_percentage", weight: 5 },
    { key: "class_12_board", weight: 4 },
    { key: "class_12_percentage", weight: 5 },
    { key: "social_category", weight: 4 },
    { key: "preferred_stream", weight: 5 },
    { key: "preferred_level", weight: 5 },
  ];
  const totalWeight = completionFields.reduce((s, f) => s + f.weight, 0);
  const earned = completionFields.reduce((s, f) => s + (profileAny?.[f.key] ? f.weight : 0), 0);
  const completion = Math.min(100, Math.round((earned / totalWeight) * 100));
  const isComplete = completion >= 100;

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id) return;
    if (file.size > 3 * 1024 * 1024) { toast.error("Image too large (max 3 MB)"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `user-avatars/${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("admin-uploads").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("admin-uploads").getPublicUrl(path);
      await updateProfile.mutateAsync({ profile_image_url: data.publicUrl });
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Completion bar / rewards CTA */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="relative w-16 h-16 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-xl font-bold text-primary overflow-hidden group shrink-0"
          >
            {profileAny?.profile_image_url ? (
              <img src={profileAny.profile_image_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (profileAny?.display_name || "U").charAt(0).toUpperCase()
            )}
            <span className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              {uploading ? <Loader2 className="w-4 h-4 text-background animate-spin" /> : <Camera className="w-4 h-4 text-background" />}
            </span>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-primary" />
                  Fill details and unlock exclusive rewards
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isComplete ? "🎉 You've unlocked your reward! Our team will reach out." : "Reach 100% to claim a special gift just for you."}
                </p>
              </div>
              <span className={`text-sm font-bold ${isComplete ? "text-emerald-600" : "text-primary"}`}>{completion}%</span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isComplete ? "bg-emerald-500" : "bg-primary"}`}
                style={{ width: `${completion}%` }}
              />
            </div>
            <button type="button" onClick={() => avatarInputRef.current?.click()} className="mt-2 text-[11px] text-primary font-medium inline-flex items-center gap-1">
              <Upload className="w-3 h-3" /> {profileAny?.profile_image_url ? "Change photo" : "Upload profile photo"}
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">Edit any field - a Save button will appear after you change a value.</p>

      <Section title="Basic Details">
        <InlineField label="Full Name" value={profileAny?.display_name} onSave={save("display_name")} />
        <InlineField label="Date of Birth" value={profileAny?.dob} onSave={save("dob")} type="date" />
        <InlineField label="Gender" value={profileAny?.gender} onSave={save("gender")} type="select" options={["Male","Female","Other"]} />
        <InlineField label="Social Category" value={profileAny?.social_category} onSave={save("social_category")} type="select" options={["General","OBC","SC","ST","EWS"]} />
        <InlineField label="Marital Status" value={profileAny?.marital_status} onSave={save("marital_status")} type="select" options={["Single","Married","Other"]} />
      </Section>

      <Section title="Contact Details">
        <InlineField
          label="Mobile Number"
          value={profileAny?.phone}
          onSave={save("phone")}
          locked={lockPhone}
          lockedHint={lockPhone ? "Account is signed in via this mobile number - cannot be changed." : undefined}
        />
        <InlineField label="Email Address" value={profileAny?.email} onSave={save("email")} />
        <InlineField label="State" value={stateValue} onSave={save("state")} type="select" options={(locations?.states || []) as string[]} />
        <InlineField label="City" value={profileAny?.city} onSave={save("city")} type="select" options={cityOptions} />
      </Section>


      <Section title="Education">
        <InlineField label="Current Status" value={profileAny?.education_status} onSave={save("education_status")} type="select" options={EDU_OPTIONS} />
        <InlineField label="Current Semester" value={profileAny?.current_semester} onSave={save("current_semester")} type="select" options={["1","2","3","4","5","6","7","8"]} />
      </Section>

      <Section title="Class X">
        <InlineField label="Board" value={profileAny?.class_10_board} onSave={save("class_10_board")} />
        <InlineField label="School" value={profileAny?.class_10_school} onSave={save("class_10_school")} />
        <InlineField label="Passing Year" value={profileAny?.class_10_year} onSave={save("class_10_year")} />
        <InlineField label="Marks Type" value={profileAny?.class_10_marks_type} onSave={save("class_10_marks_type")} type="select" options={["Percentage","CGPA"]} />
        <InlineField label="Percentage / CGPA" value={profileAny?.class_10_percentage} onSave={save("class_10_percentage")} />
      </Section>

      <Section title="Class XII">
        <InlineField label="Board" value={profileAny?.class_12_board} onSave={save("class_12_board")} />
        <InlineField label="School" value={profileAny?.class_12_school} onSave={save("class_12_school")} />
        <InlineField label="Passing Year" value={profileAny?.class_12_year} onSave={save("class_12_year")} />
        <InlineField label="Marks Type" value={profileAny?.class_12_marks_type} onSave={save("class_12_marks_type")} type="select" options={["Percentage","CGPA"]} />
        <InlineField label="Percentage / CGPA" value={profileAny?.class_12_percentage} onSave={save("class_12_percentage")} />
      </Section>

      <HigherEducationSection />
    </div>
  );
}
