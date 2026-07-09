import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureBootstrap } from "@/lib/bootstrap";

export type LeadOtpMode = "on" | "off" | "test";
export type LeadChannelPreference = "sms" | "whatsapp" | "both";

// Registry of every form that may invoke OTP. Add new keys here when wiring new forms.
export const LEAD_FORM_KEYS: Array<{ key: string; label: string; description: string }> = [
  { key: "ai_chat", label: "AI Chat / Search", description: "Mandatory lead form for the AI bot & smart search." },
  { key: "sidebar", label: "Sidebar Lead Form", description: "Sticky sidebar form on detail pages." },
  { key: "popup", label: "Periodic Popup", description: "Time-based popup lead capture." },
  { key: "landing", label: "Landing Pages", description: "Landing page hero / inline forms." },
  { key: "loan", label: "Education Loan", description: "Loan enquiry & loan-gated CTAs." },
  { key: "trending_program", label: "Trending Programs", description: "Premium / trending course enquiries." },
];

export interface LeadFormSettings {
  id: string;
  otp_mode: LeadOtpMode;
  channel_preference: LeadChannelPreference;
  form_overrides: Record<string, LeadChannelPreference>;
  updated_at: string;
}

const DEFAULT: LeadFormSettings = { id: "", otp_mode: "off", channel_preference: "sms", form_overrides: {}, updated_at: "" };

export function useLeadFormSettings() {
  return useQuery({
    queryKey: ["lead-form-settings"],
    queryFn: async () => {
      const boot = await ensureBootstrap();
      if (boot && "lead_form_settings" in boot) {
        return (boot.lead_form_settings ?? DEFAULT) as LeadFormSettings;
      }
      const { data, error } = await supabase
        .from("lead_form_settings" as any)
        .select("id, otp_mode, channel_preference, form_overrides, updated_at")
        .eq("singleton", true)
        .maybeSingle();
      if (error) throw error;
      return (data ?? DEFAULT) as LeadFormSettings;
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdateLeadOtpMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mode: LeadOtpMode) => {
      const { error } = await supabase
        .from("lead_form_settings" as any)
        .update({ otp_mode: mode })
        .eq("singleton", true);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-form-settings"] }),
  });
}

export function useUpdateLeadChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (channel: LeadChannelPreference) => {
      const { error } = await supabase
        .from("lead_form_settings" as any)
        .update({ channel_preference: channel })
        .eq("singleton", true);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-form-settings"] }),
  });
}

export function useUpdateFormOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ formKey, channel }: { formKey: string; channel: LeadChannelPreference | null }) => {
      const { data: current, error: readErr } = await supabase
        .from("lead_form_settings" as any)
        .select("form_overrides")
        .eq("singleton", true)
        .maybeSingle();
      if (readErr) throw readErr;
      const overrides = { ...((current as any)?.form_overrides || {}) } as Record<string, LeadChannelPreference>;
      if (channel === null) delete overrides[formKey];
      else overrides[formKey] = channel;
      const { error } = await supabase
        .from("lead_form_settings" as any)
        .update({ form_overrides: overrides })
        .eq("singleton", true);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-form-settings"] }),
  });
}

/** Resolve which channel a given form should use, applying overrides on top of global. */
export function resolveChannel(
  settings: LeadFormSettings | undefined,
  formKey?: string,
): LeadChannelPreference {
  if (!settings) return "sms";
  if (formKey && settings.form_overrides?.[formKey]) return settings.form_overrides[formKey];
  return settings.channel_preference ?? "sms";
}
