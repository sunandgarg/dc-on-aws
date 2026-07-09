import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface PayloadFieldConfig {
  fieldName: string;
  displayName: string;
  sourceType: "lead_data" | "static" | "dynamic";
  sourceKey?: string;
  staticValue?: string;
  dynamicType?: "source" | "medium" | "campaign" | "college_id" | "secret_key";
  isRequired: boolean;
  sortOrder: number;
}

interface LeadPayload {
  universityId: string;
  batchId: string;
  leadData: Record<string, string>;
  apiConfig: {
    apiUrl: string;
    secretKey: string;
    collegeId: string;
    source: string;
    medium: string;
    campaign: string;
    apiType: string;
    columnMapping: Record<string, string>;
    customColumnMapping?: Record<string, string>;
    payloadWrapper?: string;
    authType?: string;
    authHeaderKey?: string;
    authHeaderValue?: string;
    customHeaders?: Record<string, string>;
    universityDefaults?: Record<string, string>;
  };
}

// Categorize API response into Success/Duplicate/Fail
function categorizeResponse(httpStatus: number, responseBody: string, isHttpOk: boolean): string {
  const rs = responseBody.toLowerCase();

  const isDuplicate =
    rs.includes("duplicate") || rs.includes("already exist") || rs.includes("already registered") ||
    rs.includes("already present") || rs.includes("record exists") || rs.includes("lead already") ||
    rs.includes("entry already") || rs.includes("email already") || rs.includes("mobile already") ||
    rs.includes("phone already") || rs.includes("contact already");

  if (httpStatus === 409 || isDuplicate) {
    return "Duplicate";
  }

  if (isHttpOk) {
    try {
      const jr = JSON.parse(responseBody);
      const errCode = String(jr.errorCode || jr.error_code || "").toLowerCase();
      const jrStatus = String(jr.status || jr.Status || "").toLowerCase();

      if (errCode === "duplicate" || jrStatus === "duplicate") {
        return "Duplicate";
      }

      const errMsg = String(jr.error || jr.message || jr.Message || "").toLowerCase();
      if (errMsg.includes("duplicate") || errMsg.includes("already exist") || errMsg.includes("already registered") ||
          errMsg.includes("email already") || errMsg.includes("mobile already")) {
        return "Duplicate";
      }

      // Check isLeadExists / leadAlreadyExists — if lead already exists, treat as Duplicate
      if (jr.isLeadExists === true || jr.leadAlreadyExists === true) {
        return "Duplicate";
      }

      // upGrad: firstByUser=false means lead already existed → Duplicate
      if (jr.firstByUser === false) {
        return "Duplicate";
      }

      // upGrad Lead-Drop returns a leadIdentifier on success (HTTP 2xx) with firstByUser=true
      if (jr.leadIdentifier || jr.lead_identifier || jr.leadId) {
        return "Success";
      }

      const numericStatus = Number(jr.status ?? jr.Status ?? jr.statusCode ?? jr.code);
      if (!isNaN(numericStatus) && numericStatus >= 200 && numericStatus < 300) {
        return "Success";
      }

      const msgLower = String(jr.message || jr.Message || "").toLowerCase();
      if (
        msgLower.includes("submitted successfully") ||
        msgLower.includes("submitted succesfully") ||
        msgLower.includes("success") ||
        msgLower === "data submitted"
      ) {
        return "Success";
      }

      if (
        jrStatus === "success" || jr.success === true || jr.IsCreated === true ||
        String(jr.result || jr.Result || "").toLowerCase() === "success" || jr.message === "1"
      ) {
        return "Success";
      }

      if (jrStatus === "fail" || jrStatus === "failed" || jr.success === false || jr.error) {
        return "Fail";
      }

      return "Fail";
    } catch {
      return "Fail";
    }
  }

  return "Fail";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batchId, leadData, apiConfig } = (await req.json()) as LeadPayload;

    let responseBody = "";
    let status = "Fail";
    let httpStatus = 0;

    try {
      let payload: unknown;
      const headers: Record<string, string> = { "Content-Type": "application/json" };

      if (apiConfig.authType === "bearer" && apiConfig.authHeaderValue) {
        headers["Authorization"] = `Bearer ${apiConfig.authHeaderValue}`;
      } else if (apiConfig.authType === "custom_header" && apiConfig.authHeaderKey && apiConfig.authHeaderValue) {
        headers[apiConfig.authHeaderKey] = apiConfig.authHeaderValue;
      }
      if (apiConfig.customHeaders) {
        Object.entries(apiConfig.customHeaders).forEach(([key, value]) => {
          if (key && value) headers[key] = value;
        });
      }

      const payloadFields: PayloadFieldConfig[] = [];
      const staticFields: Record<string, string> = {};
      const fixedDefaults: Record<string, string> = {};
      const fieldMappings: Record<string, string> = {};
      const customColumnMapping = apiConfig.customColumnMapping || {};

      Object.entries(apiConfig.columnMapping).forEach(([key, value]) => {
        if (key.startsWith("__field_")) {
          try { payloadFields.push(JSON.parse(value)); } catch { /* skip */ }
        } else if (key.startsWith("__static_")) {
          staticFields[key.replace("__static_", "")] = value;
        } else if (key.startsWith("__fixed_")) {
          fixedDefaults[key.replace("__fixed_", "")] = value;
        } else {
          fieldMappings[key] = value;
        }
      });

      Object.entries(customColumnMapping).forEach(([key, value]) => {
        if (value) fieldMappings[key] = value;
      });

      payloadFields.sort((a, b) => a.sortOrder - b.sortOrder);

      const leadDataWithDefaults = { ...leadData };
      Object.entries(fixedDefaults).forEach(([key, defaultValue]) => {
        if (!leadDataWithDefaults[key] || !leadDataWithDefaults[key].trim()) {
          leadDataWithDefaults[key] = defaultValue;
        }
      });

      const uniDefaults = apiConfig.universityDefaults || {};
      Object.entries(uniDefaults).forEach(([key, defaultValue]) => {
        if (defaultValue && (!leadDataWithDefaults[key] || !leadDataWithDefaults[key].trim())) {
          leadDataWithDefaults[key] = defaultValue;
        }
      });

      if (apiConfig.apiType === "upgrad") {
        // upGrad lead-drop API must always use nested JSON, even when default payload fields exist.
        const src = leadDataWithDefaults.leadSource || apiConfig.source || "";
        const med = leadDataWithDefaults.leadMedium || apiConfig.medium || "";
        const camp = leadDataWithDefaults.leadCampaign || apiConfig.campaign || "";
        if (src) headers["utm_source"] = src;
        if (med) headers["utm_medium"] = med;
        if (camp) headers["utm_campaign"] = camp;

        const sk = (apiConfig.secretKey || "").trim();
        if (sk) {
          if (sk.toLowerCase().startsWith("basic ")) headers["Authorization"] = sk;
          else if (sk.includes(":")) headers["Authorization"] = `Basic ${btoa(sk)}`;
          else headers["Authorization"] = `Basic ${sk}`;
        }

        const upgradSrcMap: Record<string, string> = {};
        const upgradMeta: Record<string, string> = {};
        Object.entries(apiConfig.columnMapping).forEach(([k, v]) => {
          if (k.startsWith("__upgrad_src_") && v) upgradSrcMap[k.replace("__upgrad_src_", "")] = v;
          else if (k.startsWith("__upgrad_meta_") && v) upgradMeta[k.replace("__upgrad_meta_", "")] = v;
        });

        const readField = (upgradField: string, fallbackCsv: string): string => {
          const aliasMap: Record<string, string[]> = {
            mobile: ["phone.number", "mobile"],
            course: ["course", "programOfInterest"],
            firstname: ["firstname", "name"],
            lastname: ["lastname"],
          };
          const csvKey = upgradSrcMap[upgradField] || fallbackCsv;
          const candidates = [csvKey, upgradField, ...(aliasMap[upgradField] || []), fallbackCsv];
          for (const candidate of candidates) {
            const value = leadDataWithDefaults[candidate];
            if (value) return value;
          }
          return "";
        };

        const fullName = (leadDataWithDefaults.name || "").trim();
        const nameParts = fullName.split(/\s+/).filter(Boolean);
        const firstname = (readField("firstname", "firstname") || nameParts.shift() || "Lead").trim();
        const lastname = (readField("lastname", "lastname") || nameParts.join(" ") || firstname).trim();

        const rawMobileInput = (readField("mobile", "phone.number") || "").trim();
        let phoneCode = (leadDataWithDefaults["phone.code"] || leadDataWithDefaults["phone.countryCode"] || "+91").trim() || "+91";
        let phoneNumber = rawMobileInput.replace(/\D/g, "");
        const plusMatch = rawMobileInput.match(/^\+(\d{1,3})/);
        if (plusMatch) {
          phoneCode = `+${plusMatch[1]}`;
          phoneNumber = phoneNumber.slice(plusMatch[1].length);
        } else if (phoneNumber.length === 12 && phoneNumber.startsWith("91")) {
          phoneNumber = phoneNumber.slice(2);
        } else if (phoneNumber.length === 11 && phoneNumber.startsWith("0")) {
          phoneNumber = phoneNumber.slice(1);
        }

        const upPayload: Record<string, unknown> = {
          firstname,
          lastname,
          email: readField("email", "email"),
          phone: { number: phoneNumber, code: phoneCode },
          course: readField("course", "course"),
          sendWelcomeMail: true,
          city: readField("city", "city"),
          state: readField("state", "state"),
          country: leadDataWithDefaults.country || upgradMeta.country || "India",
          isDetectLocation: false,
          affiliateSource: leadDataWithDefaults.affiliateSource || upgradMeta.affiliateSource || "aff_id=1&sub_aff_id=12",
          leadSource: {
            platform: leadDataWithDefaults["leadSource.platform"] || "",
            platformSection: leadDataWithDefaults["leadSource.platformSection"] || "",
          },
          extraFields: {
            chatLink: leadDataWithDefaults["extraFields.chatLink"] || upgradMeta.chatLink || "haptik.com/1234567",
          },
          emailTemplateSuffix: leadDataWithDefaults.emailTemplateSuffix || upgradMeta.emailTemplateSuffix || "in",
        };

        Object.entries(staticFields).forEach(([k, v]) => {
          if (!v) return;
          if (k === "extraFields.LSQID") return;
          if (k.includes(".")) {
            const segments = k.split(".");
            let cursor = upPayload as Record<string, unknown>;
            for (let i = 0; i < segments.length - 1; i++) {
              const seg = segments[i];
              if (typeof cursor[seg] !== "object" || cursor[seg] === null) cursor[seg] = {};
              cursor = cursor[seg] as Record<string, unknown>;
            }
            cursor[segments[segments.length - 1]] = v;
          } else {
            upPayload[k] = v;
          }
        });
        payload = upPayload;
      } else if (payloadFields.length > 0) {
        const formPayload: Record<string, string> = {};
        payloadFields.forEach((field) => {
          if (!field.fieldName) return;
          let value = "";
          if (field.sourceType === "lead_data" && field.sourceKey) {
            value = leadDataWithDefaults[field.sourceKey] || "";
          } else if (field.sourceType === "static") {
            value = field.staticValue || "";
          } else if (field.sourceType === "dynamic") {
            switch (field.dynamicType) {
              case "source": value = leadDataWithDefaults.leadSource || apiConfig.source; break;
              case "medium": value = leadDataWithDefaults.leadMedium || apiConfig.medium; break;
              case "campaign": value = leadDataWithDefaults.leadCampaign || apiConfig.campaign; break;
              case "college_id": value = apiConfig.collegeId; break;
              case "secret_key": value = apiConfig.secretKey; break;
            }
          }
          if (value || field.isRequired) formPayload[field.fieldName] = value;
        });
        Object.entries(leadDataWithDefaults).forEach(([key, value]) => {
          if (value && !["leadSource", "leadMedium", "leadCampaign"].includes(key)) {
            const apiKey = fieldMappings[key] || key;
            if (!formPayload[apiKey]) formPayload[apiKey] = value;
          }
        });
        payload = formPayload;
      } else if (apiConfig.apiType === "leadsquared") {
        const lsPayload: Record<string, string> = {};
        Object.entries(leadDataWithDefaults).filter(([_, v]) => v).forEach(([key, value]) => {
          lsPayload[fieldMappings[key] || key] = value;
        });
        Object.entries(staticFields).forEach(([key, value]) => { if (value) lsPayload[key] = value; });
        payload = lsPayload;
      } else if (apiConfig.apiType === "meritto" || apiConfig.apiType === "nopaperforms") {
        const formData: Record<string, string> = {};
        Object.entries(leadDataWithDefaults).forEach(([key, value]) => {
          if (value) formData[fieldMappings[key] || key] = value;
        });
        formData[fieldMappings["medium"] || "medium"] = leadDataWithDefaults.leadMedium || apiConfig.medium;
        formData[fieldMappings["campaign"] || "campaign"] = leadDataWithDefaults.leadCampaign || apiConfig.campaign;
        formData.college_id = apiConfig.collegeId;
        formData[fieldMappings["source"] || "source"] = leadDataWithDefaults.leadSource || apiConfig.source;
        formData.secret_key = apiConfig.secretKey;
        Object.entries(staticFields).forEach(([key, value]) => { formData[key] = value; });
        payload = formData;
      } else {
        const genericPayload: Record<string, string> = {};
        const hasSourceMapping = Object.keys(apiConfig.columnMapping).some((k) => k === "leadSource" || k === "source");
        const hasMediumMapping = Object.keys(apiConfig.columnMapping).some((k) => k === "leadMedium" || k === "medium");
        const hasCampaignMapping = Object.keys(apiConfig.columnMapping).some((k) => k === "leadCampaign" || k === "campaign");

        Object.entries(leadDataWithDefaults).forEach(([key, value]) => {
          if (value && !["leadSource", "leadMedium", "leadCampaign"].includes(key)) {
            genericPayload[fieldMappings[key] || key] = value;
          }
        });
        if (hasSourceMapping) {
          const v = leadDataWithDefaults.leadSource || apiConfig.source;
          if (v) genericPayload[fieldMappings["leadSource"] || fieldMappings["source"] || "source"] = v;
        }
        if (hasMediumMapping) {
          const v = leadDataWithDefaults.leadMedium || apiConfig.medium;
          if (v) genericPayload[fieldMappings["leadMedium"] || fieldMappings["medium"] || "medium"] = v;
        }
        if (hasCampaignMapping) {
          const v = leadDataWithDefaults.leadCampaign || apiConfig.campaign;
          if (v) genericPayload[fieldMappings["leadCampaign"] || fieldMappings["campaign"] || "campaign"] = v;
        }
        if (apiConfig.collegeId) genericPayload.college_id = apiConfig.collegeId;
        if (apiConfig.secretKey) genericPayload.secret_key = apiConfig.secretKey;
        Object.entries(staticFields).forEach(([key, value]) => { if (value) genericPayload[key] = value; });
        payload = genericPayload;
      }

      if (apiConfig.apiType === "leadsquared" && !Array.isArray(payload)) {
        const flat = payload as Record<string, string>;
        payload = Object.entries(flat)
          .filter(([_, v]) => v !== undefined && v !== null && v !== "")
          .map(([key, value]) => ({ Attribute: key, Value: String(value) }));
      }

      const finalPayload = apiConfig.payloadWrapper === "array" && !Array.isArray(payload) ? [payload] : payload;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const apiResponse = await fetch(apiConfig.apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(finalPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      httpStatus = apiResponse.status;
      responseBody = await apiResponse.text();

      status = categorizeResponse(httpStatus, responseBody, apiResponse.ok);
    } catch (fetchError) {
      responseBody = JSON.stringify({ error: String(fetchError), type: "network_error" });
      status = "Fail";
    }

    // Only increment batch counter — no leads table write, no api_logs
    if (batchId) {
      let batchRpc: string;
      if (status === "Success") {
        batchRpc = "increment_batch_success";
      } else if (status === "Duplicate") {
        batchRpc = "increment_batch_duplicate";
      } else {
        batchRpc = "increment_batch_fail";
      }
      try { await supabase.rpc(batchRpc, { batch_uuid: batchId }); } catch (_) { /* ignore */ }
    }

    return new Response(
      JSON.stringify({ success: status === "Success", status, response: responseBody, httpStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ success: false, status: "Fail", error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
