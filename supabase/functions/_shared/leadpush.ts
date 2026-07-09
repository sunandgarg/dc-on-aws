// Shared payload builder + sender for partner-university APIs
// Used by lp-dispatch-lead, lp-process-batch, lp-test-api, lp-multi-push

export type University = Record<string, any>;
export type LeadData = Record<string, string>;

export function leadRowToData(lead: Record<string, any>): LeadData {
  return {
    name: lead.name || "",
    email: lead.email || "",
    mobile: lead.phone || lead.mobile || "",
    phone: lead.phone || lead.mobile || "",
    city: lead.city || "",
    state: lead.state || "",
    course: lead.interested_course_slug || lead.course || lead.cta || lead.initial_query || "",
    specialization: lead.specialization || "",
    address: lead.address || "",
    university: lead.interested_college_slug || lead.university || "",
    leadSource: lead.source || lead.leadSource || "",
    leadMedium: lead.medium || lead.leadMedium || "",
    leadCampaign: lead.campaign || lead.cta || lead.leadCampaign || "",
  };
}

export function categorize(httpStatus: number, body: string, ok: boolean): string {
  const rs = (body || "").toLowerCase();
  if (httpStatus === 409 || rs.includes("duplicate") || rs.includes("already exist") || rs.includes("already registered")) return "Duplicate";
  if (ok) {
    try {
      const j = JSON.parse(body);
      if (j.firstByUser === false || j.isLeadExists === true) return "Duplicate";
      if (j.leadIdentifier || j.leadId || j.success === true) return "Success";
      const s = String(j.status || j.Status || "").toLowerCase();
      if (s === "success") return "Success";
      if (s === "fail" || s === "failed" || j.error) return "Fail";
      return "Success";
    } catch { return "Success"; }
  }
  return "Fail";
}

export function applyTransform(v: string, transform?: string): string {
  const s = String(v ?? "");
  if (!s) return s;
  const parts = s.trim().split(/\s+/).filter(Boolean);
  switch (transform) {
    case "first": return parts[0] || "";
    case "last": return parts.length > 1 ? parts.slice(1).join(" ") : (parts[0] || "");
    case "initials": return parts.map((p) => p[0]?.toUpperCase() || "").join("");
    case "lower": return s.toLowerCase();
    case "upper": return s.toUpperCase();
    case "digits": return s.replace(/\D/g, "");
    case "full":
    default: return s;
  }
}

export function resolvePrefillValue(cfg: any, lead: LeadData): string {
  // Back-compat: plain string = static value
  if (typeof cfg === "string") return cfg;
  if (!cfg || typeof cfg !== "object") return "";
  if (cfg.mode === "static") return String(cfg.value ?? "");
  if (cfg.mode === "lead") {
    const raw = String(lead[cfg.leadField] ?? "");
    return applyTransform(raw, cfg.transform);
  }
  return ""; // mode === "default" → fall through to uni default mapping
}

export async function buildAndSend(
  uni: University,
  lead: Record<string, any>,
  fieldOverrides: Record<string, string> = {},
): Promise<{ status: string; httpStatus: number; body: string; payload: unknown; error?: string }> {
  const data = leadRowToData(lead);
  const mapping: Record<string, string> = uni.column_mapping || {};
  const staticFields: Record<string, string> = uni.static_fields || {};
  const defaults: Record<string, string> = uni.university_defaults || uni.default_values || {};

  Object.entries(defaults).forEach(([k, v]) => { if (!data[k] && v) data[k] = v; });

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (uni.auth_type === "bearer" && uni.auth_header_value) headers["Authorization"] = `Bearer ${uni.auth_header_value}`;
  else if (uni.auth_type === "custom_header" && uni.auth_header_key && uni.auth_header_value) headers[uni.auth_header_key] = uni.auth_header_value;
  if (uni.custom_headers) Object.entries(uni.custom_headers as Record<string, string>).forEach(([k, v]) => { if (k && v) headers[k] = v; });

  let payload: any;
  if (uni.api_type === "upgrad") {
    const sk = (uni.secret_key || "").trim();
    if (sk) headers["Authorization"] = sk.toLowerCase().startsWith("basic ") ? sk : (sk.includes(":") ? `Basic ${btoa(sk)}` : `Basic ${sk}`);
    if (uni.source) headers["utm_source"] = uni.source;
    if (uni.medium) headers["utm_medium"] = uni.medium;
    if (uni.campaign) headers["utm_campaign"] = uni.campaign;
    const parts = (data.name || "").trim().split(/\s+/).filter(Boolean);
    const firstname = parts.shift() || "Lead";
    const lastname = parts.join(" ") || firstname;
    let phoneNumber = (data.mobile || "").replace(/\D/g, "");
    if (phoneNumber.length === 12 && phoneNumber.startsWith("91")) phoneNumber = phoneNumber.slice(2);
    payload = {
      firstname, lastname, email: data.email,
      phone: { number: phoneNumber, code: "+91" },
      course: data.course, sendWelcomeMail: true,
      city: data.city, state: data.state, country: "India",
      isDetectLocation: false, affiliateSource: "aff_id=1&sub_aff_id=12",
      leadSource: { platform: "DekhoCampus", platformSection: "" },
      extraFields: {}, emailTemplateSuffix: "in",
      ...staticFields,
    };
  } else {
    const out: Record<string, string> = {};
    Object.entries(data).forEach(([k, v]) => { if (v) out[mapping[k] || k] = String(v); });
    if (uni.college_id) out["college_id"] = uni.college_id;
    if (uni.secret_key) out["secret_key"] = uni.secret_key;
    if (uni.source) out[mapping["source"] || "source"] = uni.source;
    if (uni.medium) out[mapping["medium"] || "medium"] = uni.medium;
    if (uni.campaign) out[mapping["campaign"] || "campaign"] = uni.campaign;
    Object.entries(staticFields).forEach(([k, v]) => { if (v) out[k] = v; });
    payload = out;
  }

  // Apply per-rule per-university overrides (last so they win)
  if (fieldOverrides && Object.keys(fieldOverrides).length) {
    if (uni.api_type === "upgrad") {
      // upgrad payload is structured — only override top-level scalar keys
      Object.entries(fieldOverrides).forEach(([k, v]) => { if (v !== "" && v != null) (payload as any)[k] = v; });
    } else {
      Object.entries(fieldOverrides).forEach(([k, v]) => { if (v !== "" && v != null) (payload as Record<string, string>)[k] = v; });
    }
  }

  if ((uni.payload_wrapper === "array" || uni.api_type === "leadsquared") && !Array.isArray(payload)) payload = [payload];


  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    const r = await fetch(uni.api_url, { method: "POST", headers, body: JSON.stringify(payload), signal: ctrl.signal });
    clearTimeout(t);
    const body = await r.text();
    return { status: categorize(r.status, body, r.ok), httpStatus: r.status, body, payload };
  } catch (e) {
    return { status: "Fail", httpStatus: 0, body: "", payload, error: String(e) };
  }
}
