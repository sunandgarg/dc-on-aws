// Admin-only CSV export of leads enriched with intent score + timeline.
// Also exposes a JSON API mode for partner integrations.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function csvEscape(v: any): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const filters = { ...Object.fromEntries(url.searchParams), ...body };
    const format = (filters.format || "csv").toString().toLowerCase();

    let q = supabase.from("intent_lead_scores").select("*").order("score", { ascending: false }).limit(5000);
    if (filters.category)         q = q.eq("category", filters.category);
    if (filters.top_college_slug) q = q.eq("top_college_slug", filters.top_college_slug);
    if (filters.top_course_slug)  q = q.eq("top_course_slug",  filters.top_course_slug);
    if (filters.min_score)        q = q.gte("score", Number(filters.min_score));
    if (filters.max_score)        q = q.lte("score", Number(filters.max_score));
    if (filters.from)             q = q.gte("updated_at", filters.from);
    if (filters.to)               q = q.lte("updated_at", filters.to);

    const { data: scores, error } = await q;
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: cors });

    // Pull lead identity by linked lead_id OR by user_id->profile
    const leadIds = (scores || []).map(s => s.lead_id).filter(Boolean);
    const userIds = (scores || []).filter(s => s.subject_type === "user").map(s => s.subject_id);
    const [{ data: leads }, { data: profs }] = await Promise.all([
      leadIds.length ? supabase.from("leads").select("id,name,email,phone,city,state,interested_college_slug,interested_course_slug,source,created_at").in("id", leadIds as any) : Promise.resolve({ data: [] as any[] }),
      userIds.length ? supabase.from("profiles").select("user_id,display_name,email,phone").in("user_id", userIds as any) : Promise.resolve({ data: [] as any[] }),
    ]);
    const leadById = new Map((leads || []).map((l: any) => [l.id, l]));
    const profById = new Map((profs || []).map((p: any) => [p.user_id, p]));

    // Recent timeline per subject (last 10)
    const subjectIds = (scores || []).map(s => s.subject_id);
    const { data: events } = subjectIds.length ? await supabase
      .from("intent_events")
      .select("occurred_at,event_type,college_slug,course_slug,page_url,user_id,visitor_id")
      .or(`user_id.in.(${userIds.length ? userIds.join(",") : "00000000-0000-0000-0000-000000000000"}),visitor_id.in.(${subjectIds.length ? subjectIds.join(",") : "00000000-0000-0000-0000-000000000000"})`)
      .order("occurred_at", { ascending: false })
      .limit(5000) : { data: [] as any[] };

    const timelineBySubject = new Map<string, any[]>();
    for (const e of events || []) {
      const key = e.user_id || e.visitor_id;
      if (!key) continue;
      const arr = timelineBySubject.get(key) || [];
      if (arr.length < 10) arr.push(e);
      timelineBySubject.set(key, arr);
    }

    const rows = (scores || []).map((s: any) => {
      const lead = s.lead_id ? leadById.get(s.lead_id) : null;
      const prof = s.subject_type === "user" ? profById.get(s.subject_id) : null;
      const tl   = timelineBySubject.get(s.subject_id) || [];
      return {
        student_name:    lead?.name || prof?.display_name || "",
        mobile:          lead?.phone || prof?.phone || "",
        email:           lead?.email || prof?.email || "",
        city:            lead?.city || "",
        state:           lead?.state || "",
        course_interest: s.top_course_slug || lead?.interested_course_slug || "",
        interested_colleges: s.top_college_slug || lead?.interested_college_slug || "",
        lead_score:      s.score,
        lead_category:   s.category,
        last_activity:   s.last_event_type,
        last_activity_at: s.last_event_at,
        timeline:        tl.map((e: any) => `${e.occurred_at} | ${e.event_type} | ${e.college_slug || ""} | ${e.course_slug || ""}`).join(" || "),
        source_channel:  lead?.source || "organic",
        registered_at:   lead?.created_at || s.created_at,
      };
    });

    // Log export
    try {
      await supabase.from("intent_crm_exports").insert({ filters, row_count: rows.length, format });
    } catch {}

    if (format === "json") {
      return new Response(JSON.stringify({ rows }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const headers = ["student_name","mobile","email","city","state","course_interest","interested_colleges","lead_score","lead_category","last_activity","last_activity_at","timeline","source_channel","registered_at"];
    const csv = [headers.join(",")].concat(rows.map(r => headers.map(h => csvEscape((r as any)[h])).join(","))).join("\n");
    return new Response(csv, {
      headers: {
        ...cors,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dekhocampus-leads-${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "error" }), { status: 500, headers: cors });
  }
});
