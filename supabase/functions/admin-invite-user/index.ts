// Admin invites a user by email or phone, optionally assigns a role.
// Caller must be authenticated admin (verified by JWT against user_roles).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeIndianMobile(input: string) {
  let value = String(input || "").replace(/\D/g, "");
  while (value.startsWith("0")) value = value.slice(1);
  if (value.startsWith("91") && value.length > 10) value = value.slice(2);
  while (value.startsWith("0")) value = value.slice(1);
  return value.slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(url, service);

    const { data: ures } = await userClient.auth.getUser();
    if (!ures.user) return json({ error: "unauthorized" }, 401);

    const { data: roles } = await admin.from("user_roles")
      .select("role").eq("user_id", ures.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const { email, phone, role = "editor", display_name = "" } = body;
    if (!email && !phone) return json({ error: "email or phone required" }, 400);

    const password = crypto.randomUUID().replace(/-/g, "") + "Aa1!";
    let userId: string | null = null;

    if (email) {
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { display_name, invited_by: ures.user.id },
      });
      if (error && !`${error.message}`.includes("already")) return json({ error: error.message }, 400);
      userId = data?.user?.id ?? null;
    } else if (phone) {
      const cleanPhone = normalizeIndianMobile(phone);
      const fakeEmail = `${cleanPhone}@dekhocampus.local`;
      const { data, error } = await admin.auth.admin.createUser({
        email: fakeEmail, password, email_confirm: true,
        phone: cleanPhone,
        user_metadata: { phone: cleanPhone, display_name, invited_by: ures.user.id },
      });
      if (error && !`${error.message}`.includes("already")) return json({ error: error.message }, 400);
      userId = data?.user?.id ?? null;
    }

    if (userId && role) {
      await admin.from("user_roles").insert({ user_id: userId, role }).select();
    }

    return json({ ok: true, user_id: userId, password });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
