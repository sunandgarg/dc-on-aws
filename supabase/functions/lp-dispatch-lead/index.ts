// Auto dispatcher: triggered after every new lead via pg_net.
// Routes leads to partner universities via lp_automation_rules.
// Supports both direct rule dispatch (rule.auto_dispatch) and Multi-Flow -> Flow -> Rule wrapping.
// Merges per-university, per-course prefills into the lead before pushing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAndSend, leadRowToData, resolvePrefillValue } from "../_shared/leadpush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function norm(s: any) { return String(s || "").toLowerCase().trim(); }
function inAny(v: string | null | undefined, list: string[] | null): boolean {
  if (!list || list.length === 0) return true;
  if (!v) return false;
  const x = norm(v);
  return list.some((y) => norm(y) === x);
}
function ruleMatches(rule: any, lead: any): boolean {
  const checks: Array<[string[] | null, string | undefined]> = [
    [rule.match_cities, lead.city],
    [rule.match_states, lead.state],
    [rule.match_courses, lead.interested_course_slug || lead.initial_query || lead.cta],
    [rule.match_sources, lead.source],
    [rule.match_ctas, lead.cta],
  ];
  const active = checks.filter(([l]) => l && l.length > 0);
  if (!active.length) return true;
  return rule.match_all ? active.every(([l, v]) => inAny(v, l)) : active.some(([l, v]) => inAny(v, l));
}

async function isRateLimited(uni: any): Promise<boolean> {
  if (!uni.leads_per_minute || uni.leads_per_minute <= 0) return false;
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase.from("lp_push_logs").select("id", { count: "exact", head: true })
    .eq("university_id", uni.id).gte("created_at", since);
  return (count || 0) >= uni.leads_per_minute;
}

// Resolve per-(uni) prefill cascade: fallback ("*") <- course (course:slug | bare slug) <- campaign/source/city.
// Later layers override earlier ones (campaign wins over course wins over fallback).
function getPrefillForUni(rule: any, uniId: string, lead: any): Record<string, any> {
  const block = rule?.prefills?.[uniId] || {};
  if (!block || typeof block !== "object") return {};
  const out: Record<string, any> = {};
  const merge = (b: any) => { if (b && typeof b === "object") Object.assign(out, b); };

  merge(block["*"]); merge(block["default"]);

  const courseSlug = norm(lead.interested_course_slug || lead.initial_query || lead.cta || "");
  if (courseSlug) {
    for (const k of Object.keys(block)) {
      const kn = norm(k);
      if (kn === courseSlug || kn === `course:${courseSlug}`) merge(block[k]);
    }
  }

  const campaign = norm(lead.cta || lead.campaign || "");
  const source = norm(lead.source || "");
  const city = norm(lead.city || "");
  for (const k of Object.keys(block)) {
    const kn = norm(k);
    if (campaign && kn === `campaign:${campaign}`) merge(block[k]);
    if (source && kn === `source:${source}`) merge(block[k]);
    if (city && kn === `city:${city}`) merge(block[k]);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { lead_id, lead: leadOverride, dry_run } = await req.json();
    let lead: any = leadOverride || null;
    if (!lead && lead_id) {
      const { data } = await supabase.from("leads").select("*").eq("id", lead_id).maybeSingle();
      lead = data;
    }
    if (!lead) return new Response(JSON.stringify({ error: "lead not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Collect candidate rules from BOTH paths:
    // (a) auto_dispatch rules → fire directly
    // (b) rules referenced via active Multi-Flow → Flow chain
    const [{ data: directRules }, { data: multis }] = await Promise.all([
      supabase.from("lp_automation_rules").select("*").eq("is_active", true).eq("auto_dispatch", true).order("priority"),
      supabase.from("lp_multi_flows").select("*").eq("is_active", true).eq("trigger_event", "lead_insert"),
    ]);

    let flowRules: any[] = [];
    let flows: any[] = [];
    if (multis?.length) {
      const flowIds = Array.from(new Set(multis.flatMap((m: any) => m.flow_ids || [])));
      if (flowIds.length) {
        const { data: f } = await supabase.from("lp_marketing_flows").select("*").in("id", flowIds).eq("is_active", true);
        flows = f || [];
        const ruleIds = Array.from(new Set(flows.flatMap((f: any) => f.rule_ids || [])));
        if (ruleIds.length) {
          const { data: r } = await supabase.from("lp_automation_rules").select("*").in("id", ruleIds).eq("is_active", true).order("priority");
          flowRules = r || [];
        }
      }
    }

    // De-dupe by rule id
    const ruleMap = new Map<string, any>();
    [...(directRules || []), ...flowRules].forEach((r) => ruleMap.set(r.id, r));
    const allRules = Array.from(ruleMap.values()).sort((a, b) => (a.priority || 100) - (b.priority || 100));

    const matched = allRules.filter((r) => ruleMatches(r, lead));
    if (!matched.length) {
      return new Response(JSON.stringify({ ok: true, dispatched: 0, reason: "no rules matched" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build {uniId -> rule} (first matched wins on priority)
    const uniToRule = new Map<string, any>();
    for (const r of matched) {
      for (const uid of r.university_ids || []) {
        if (!uniToRule.has(uid)) uniToRule.set(uid, r);
      }
    }
    const uniIds = Array.from(uniToRule.keys());
    if (!uniIds.length) {
      return new Response(JSON.stringify({ ok: true, dispatched: 0, reason: "rules matched but no universities" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: unis, error: uniError } = await supabase.from("universities").select("*").in("id", uniIds);
    if (uniError) {
      return new Response(JSON.stringify({ error: uniError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: any[] = [];
    for (const uni of unis || []) {
      const rule = uniToRule.get(uni.id);
      const flow = flows.find((f: any) => (f.rule_ids || []).includes(rule?.id));
      const multi = (multis || []).find((m: any) => (m.flow_ids || []).includes(flow?.id));
      const prefill = getPrefillForUni(rule, uni.id, lead);

      // Split prefills into:
      //  - structured per-field overrides (mode === 'lead'|'static') → applied to the final outbound payload
      //  - plain-value enrichments → merged into the lead before payload build (back-compat)
      const fieldOverrides: Record<string, string> = {};
      const leadData = leadRowToData(lead);
      const enriched = { ...lead };
      Object.entries(prefill).forEach(([k, v]) => {
        if (v && typeof v === "object" && (v as any).mode) {
          const m = (v as any).mode;
          if (m === "default") return;
          fieldOverrides[k] = resolvePrefillValue(v, leadData);
        } else if (v !== undefined && v !== null && v !== "") {
          // legacy: plain string acts as a soft default for lead enrichment
          if (enriched[k] === undefined || enriched[k] === null || enriched[k] === "") enriched[k] = v;
          // also push to outbound payload as a hard override so it appears for the uni
          fieldOverrides[k] = String(v);
        }
      });

      if (dry_run) {
        results.push({ university: uni.name, would_push: true, rule: rule?.name, prefill_keys: Object.keys(prefill), overrides: fieldOverrides });
        continue;
      }
      if (await isRateLimited(uni)) {
        await supabase.from("lp_push_logs").insert({ lead_id: lead.id ?? null, university_id: uni.id, rule_id: rule?.id, flow_id: flow?.id, multi_flow_id: multi?.id, status: "RateLimited", error: `> ${uni.leads_per_minute}/min` });
        results.push({ university: uni.name, status: "RateLimited" });
        continue;
      }
      const r = await buildAndSend(uni, enriched, fieldOverrides);

      await supabase.from("lp_push_logs").insert({
        lead_id: lead.id ?? null, university_id: uni.id, rule_id: rule?.id, flow_id: flow?.id, multi_flow_id: multi?.id,
        status: r.status, http_status: r.httpStatus, request_payload: r.payload as any, response_body: r.body, error: r.error || null,
      });
      results.push({ university: uni.name, status: r.status, http: r.httpStatus });
    }
    return new Response(JSON.stringify({ ok: true, dispatched: results.length, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("lp-dispatch-lead", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
