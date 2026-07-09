import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { name, email, phone, current_situation, city, state, initial_query, source, cta, page_url, interested_college_slug, interested_course_slug, interested_exam_slug, otp_verified, program_mode, device_type, source_category } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const mode = program_mode === "online" ? "online" : "regular";

    let device = (device_type || "").toString().toLowerCase();
    if (!["mobile", "tablet", "desktop"].includes(device)) {
      const ua = (req.headers.get("user-agent") || "").toLowerCase();
      if (/ipad|tablet|playbook|silk/.test(ua)) device = "tablet";
      else if (/mobi|android|iphone|ipod|blackberry|iemobile|opera mini/.test(ua)) device = "mobile";
      else device = "desktop";
    }

    // Infer broad source_category if not provided
    function inferCategory(src: string, url: string): string {
      const s = (src || "").toLowerCase();
      const p = (url || "").toLowerCase();
      if (s.includes("ai_chat") || p.startsWith("/ai/chat") || p.startsWith("/chat")) return "ai_chat";
      if (s.includes("ai_search") || p.startsWith("/ai/search")) return "ai_search";
      if (s.includes("refer")) return "refer_earn";
      if (s.includes("loan") || p.includes("/loan")) return "education_loan";
      if (s.includes("trending") || p.includes("/trending")) return "trending_program";
      if (s.includes("online_degree") || p.includes("/online-degree")) return "online_degree";
      if (s.includes("study_abroad") || p.includes("/study-abroad")) return "study_abroad";
      if (p.startsWith("/college-study-material") || p.includes("college-study-material")) return "college_study_material";
      if (p.startsWith("/study-material") || p.startsWith("/resources")) return "study_material";
      if (p.startsWith("/news")) return "news";
      if (p.startsWith("/articles") || p.startsWith("/article")) return "article";
      if (p.startsWith("/colleges") || p.startsWith("/college/")) return "college";
      if (p.startsWith("/courses") || p.startsWith("/course/")) return "course";
      if (p.startsWith("/exams") || p.startsWith("/exam/")) return "exam";
      if (p.startsWith("/careers") || p.startsWith("/career/")) return "career";
      if (p.startsWith("/scholarships") || p.startsWith("/scholarship/")) return "scholarship";
      if (p === "/" || p === "") return "homepage";
      return "other";
    }
    const category = source_category || inferCategory(source || "", page_url || "");

    const { data, error } = await supabase.from("leads").insert({
      name,
      email,
      phone,
      current_situation,
      city,
      state,
      initial_query,
      source: source || "chatbot",
      cta: cta || source || null,
      page_url: page_url || null,
      otp_verified: !!otp_verified,
      program_mode: mode,
      device_type: device,
      source_category: category,
      interested_college_slug: interested_college_slug || null,
      interested_course_slug: interested_course_slug || null,
      interested_exam_slug: interested_exam_slug || null,
    }).select().single();

    if (error) {
      console.error("Lead save error:", error);
      return new Response(JSON.stringify({ error: "Failed to save lead" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Lead saved:", data.id);
    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
