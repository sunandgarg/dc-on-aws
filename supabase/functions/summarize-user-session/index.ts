import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { geminiGenerate } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: events } = await supabase
      .from("user_events")
      .select("event_type, path, element, metadata, created_at")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true })
      .limit(500);

    const { data: session } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("session_id", session_id)
      .maybeSingle();

    if (!Deno.env.get("GEMINI_API_KEY")) throw new Error("GEMINI_API_KEY missing");

    const prompt = `You are a senior CRO + sales analyst for DekhoCampus (Indian college discovery & lead-gen).
Produce a tightly-structured markdown brief for the inside sales team. Be specific, factual, and short.

Use exactly these sections:
**Identity & Context** – name/phone/email if known, device, location/UTM, total time, pages visited.
**Top Page Intents** – the 2-3 colleges / courses / exams / careers they engaged with most (with paths).
**Likely Goals** – what the user is most probably trying to do (admission, comparison, fee research, scholarship, study material, loan, etc.).
**Funnel Stage** – Awareness / Consideration / Intent / Decision (pick one) with one-line justification.
**Friction & Drop-offs** – rage clicks, dead clicks, repeated page leaves, abandoned forms.
**Best Next Action for Sales** – the single highest-leverage move (call now, send brochure, share fee comparison, recommend loan, etc.) with the exact talking point.
**Lead Score (0-100)** – a number with one-line reasoning.

Do not invent details that are not in the data.

SESSION META: ${JSON.stringify(session)}
EVENTS (chronological, last 200): ${JSON.stringify(events?.slice(-200))}`;

    const summary = (await geminiGenerate({ prompt })) || "(no summary)";

    await supabase
      .from("user_sessions")
      .update({ ai_summary: summary, ai_summary_at: new Date().toISOString() })
      .eq("session_id", session_id);

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
