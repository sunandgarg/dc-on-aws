// Shared push utility for the V2 lead push module (universities/push_leads schema)
export interface ApiConfig {
  apiUrl: string;
  secretKey?: string;
  collegeId?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  apiType?: string;
  columnMapping?: Record<string, string>;
  authType?: string;
  authHeaderKey?: string;
  authHeaderValue?: string;
  customHeaders?: Record<string, string>;
  universityDefaults?: Record<string, string>;
}

export function leadToData(lead: Record<string, any>): Record<string, string> {
  return {
    name: lead.name || "",
    email: lead.email || "",
    mobile: (lead.mobile || lead.phone || "").toString(),
    phone: (lead.mobile || lead.phone || "").toString(),
    city: lead.city || "",
    state: lead.state || "",
    address: lead.address || "",
    course: lead.course || "",
    specialization: lead.specialization || "",
    leadSource: lead.leadSource || lead.lead_source || "",
    leadMedium: lead.leadMedium || lead.lead_medium || "",
    leadCampaign: lead.leadCampaign || lead.lead_campaign || "",
    ...(lead.extra_data || {}),
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

export async function pushLead(
  cfg: ApiConfig,
  lead: Record<string, any>,
): Promise<{ status: string; httpStatus: number; body: string; payload: unknown; error?: string }> {
  try {
    const data = leadToData(lead);
    const defaults = cfg.universityDefaults || {};
    Object.entries(defaults).forEach(([k, v]) => { if (!data[k] && v) data[k] = String(v); });

    const mapping = cfg.columnMapping || {};
    const apiType = (cfg.apiType || "nopaperforms").toLowerCase();

    // Build payload using mapping if provided, else default keys
    const mapped: Record<string, any> = {};
    if (Object.keys(mapping).length) {
      Object.entries(mapping).forEach(([fromKey, toKey]) => {
        if (toKey && data[fromKey] !== undefined) mapped[toKey] = data[fromKey];
      });
    } else {
      Object.assign(mapped, data);
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cfg.authType === "bearer" && cfg.authHeaderValue) headers["Authorization"] = `Bearer ${cfg.authHeaderValue}`;
    else if (cfg.authType === "custom_header" && cfg.authHeaderKey && cfg.authHeaderValue) headers[cfg.authHeaderKey] = cfg.authHeaderValue;
    if (cfg.customHeaders) Object.entries(cfg.customHeaders).forEach(([k, v]) => { if (k && v) headers[k] = v; });

    let payload: any;
    if (apiType === "nopaperforms") {
      payload = {
        collegeId: cfg.collegeId,
        secretKey: cfg.secretKey,
        source: cfg.source || "dekhocampus",
        medium: cfg.medium || "dekhocampus",
        campaign: cfg.campaign || "API",
        ...mapped,
      };
    } else {
      payload = mapped;
      if (cfg.secretKey && !payload.secretKey) payload.secretKey = cfg.secretKey;
      if (cfg.collegeId && !payload.collegeId) payload.collegeId = cfg.collegeId;
    }

    const res = await fetch(cfg.apiUrl, { method: "POST", headers, body: JSON.stringify(payload) });
    const body = await res.text();
    const status = categorize(res.status, body, res.ok);
    return { status, httpStatus: res.status, body, payload };
  } catch (e) {
    return { status: "Fail", httpStatus: 0, body: "", payload: null, error: String(e) };
  }
}

export function apiConfigFromUniversity(uni: any): ApiConfig {
  return {
    apiUrl: uni.api_url,
    secretKey: uni.secret_key,
    collegeId: uni.college_id,
    source: uni.source,
    medium: uni.medium,
    campaign: uni.campaign,
    apiType: uni.api_type,
    columnMapping: uni.column_mapping || {},
    universityDefaults: uni.default_values || {},
  };
}
