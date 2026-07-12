import { supabase } from "@/integrations/supabase/client";

export const MASTER_TEST_OTP = "313125";

export async function exchangePhoneOtpForSession(phoneDigits: string, verifiedOtp: string) {
  const { data, error } = await supabase.functions.invoke("phone-auth", {
    body: { phone: `+91${phoneDigits}`, otp: verifiedOtp },
  });

  if (error || data?.error) {
    throw new Error(error?.message || data?.error || "Could not start secure phone login.");
  }

  if (data?.session?.access_token && data?.session?.refresh_token) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (sessionError) throw sessionError;
    return;
  }

  if (!data?.token_hash) {
    throw new Error("Could not start secure phone login.");
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: data.token_hash,
    type: (data.type || "magiclink") as any,
  });
  if (verifyError) throw verifyError;
}

export async function tryExchangePhoneOtpForSession(phoneDigits: string, verifiedOtp: string) {
  try {
    await exchangePhoneOtpForSession(phoneDigits, verifiedOtp);
    return true;
  } catch (error) {
    console.warn("Phone OTP session exchange skipped:", error instanceof Error ? error.message : error);
    return false;
  }
}
