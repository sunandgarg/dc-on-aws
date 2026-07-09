import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Upload,
  Download,
  Rocket,
  FileText,
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  Clock,
  Plus,
  AlertTriangle,
  Search,
  FileDown,
  CalendarClock,
} from "lucide-react";
import { parseCSV, generateSampleCSV } from "@/utils/csvParser";
import {
  validateLeads,
  checkDatabaseDuplicates,
  generateLeadsCSV,
  buildValidationConfigFromUniversity,
  type Lead,
} from "@/utils/leadValidation";
import { LeadPreviewTable } from "./LeadPreviewTable";
import { UniversityInfoPanel } from "./UniversityInfoPanel";
import { SingleLeadForm } from "./SingleLeadForm";
import { Alert } from "../Alert";
import { supabase } from "@/integrations/supabase/client";
import { useUploadStatePersistence } from "@/hooks/useUploadStatePersistence";
import { unthrottledWait, unthrottledInterval } from "@/lib/unthrottledTimer";

interface CustomColumn {
  columnKey: string;
  columnName: string;
  isRequired: boolean;
  values: { value: string; parentValue?: string }[];
  apiFieldName?: string;
}

interface University {
  id: string;
  name: string;
  api_url: string;
  college_id: string;
  secret_key: string;
  source: string;
  medium: string;
  campaign: string;
  leads_per_minute: number;
  api_type: string;
  column_mapping: Record<string, string>;
  sample_csv_content?: string;
  courseSpecializations?: { course: string; specialization: string }[];
  stateCities?: { state: string; city: string }[];
  customColumns?: CustomColumn[];
  payload_wrapper?: string;
  auth_type?: string;
  auth_header_key?: string;
  auth_header_value?: string;
  custom_headers?: Record<string, string>;
}

type ProcessingSlugState = "processing" | "paused" | "complete" | "idle";

type LeadProcessingStatus = "pending" | "success" | "failed" | "duplicate";

const normalizeDbLeadStatus = (status: string | null | undefined): LeadProcessingStatus => {
  const value = (status || "").toLowerCase();
  if (value === "success") return "success";
  if (value === "duplicate") return "duplicate";
  if (value === "fail" || value === "failed" || value === "cancelled") return "failed";
  return "pending";
};

const normalizeIdentityPart = (value: string | null | undefined) => (value || "").trim().toLowerCase();

const buildLeadIdentityKey = (lead: { name?: string | null; email?: string | null; mobile?: string | null }) =>
  `${normalizeIdentityPart(lead.name)}|${normalizeIdentityPart(lead.email)}|${normalizeIdentityPart(lead.mobile)}`;

const UPGRAD_EXACT_SAMPLE_CSV = [
  "firstname,lastname,email,phone.number,phone.code,course,sendWelcomeMail,city,state,country,isDetectLocation,affiliateSource,leadSource.platform,leadSource.platformSection,extraFields.chatLink,emailTemplateSuffix",
  "FirstName,LastName,user@upgrad.com,9999999999,+91,entrepreneurship,true,Mumbai,Maharashtra,India,false,aff_id=1&sub_aff_id=12,,,haptik.com/1234567,in",
  "Rahul,Sharma,rahul.sharma@example.com,9876543210,+91,entrepreneurship,true,Mumbai,Maharashtra,India,false,aff_id=1&sub_aff_id=12,,,haptik.com/1234567,in",
  "Priya,Patel,priya.patel@example.com,9876501234,+91,entrepreneurship,true,Mumbai,Maharashtra,India,false,aff_id=1&sub_aff_id=12,,,haptik.com/1234567,in",
].join("\n");

const UPGRAD_EXACT_FIELDS = [
  "firstname",
  "lastname",
  "email",
  "phone.number",
  "phone.code",
  "course",
  "sendWelcomeMail",
  "city",
  "state",
  "country",
  "isDetectLocation",
  "affiliateSource",
  "leadSource.platform",
  "leadSource.platformSection",
  "extraFields.chatLink",
  "emailTemplateSuffix",
];

interface UploadLeadsTabProps {
  universities: University[];
  selectedUniversity?: University | null;
  onSelectUniversity?: (uni: University) => void;
  onFileUpload?: (filename: string) => void;
  onClearFile?: () => void;
  onProcessingStateChange?: (state: ProcessingSlugState) => void;
  currentFileName?: string | null;
  currentProcessingState?: ProcessingSlugState;
}

export function UploadLeadsTab({
  universities,
  selectedUniversity: initialSelectedUniversity,
  onSelectUniversity,
  onFileUpload,
  onClearFile: _onClearFile,
  onProcessingStateChange,
  currentFileName,
  currentProcessingState: _currentProcessingState = "idle",
}: UploadLeadsTabProps) {
  const persistence = useUploadStatePersistence();
  const { state: persistedState, processing: persistedProcessing } = persistence;

  const [selectedUniversity, setSelectedUniversityState] = useState<University | null>(() => {
    if (persistedState.selectedUniversityId) {
      const found = universities.find((u) => u.id === persistedState.selectedUniversityId);
      if (found) return found;
    }
    return initialSelectedUniversity || null;
  });

  const leads = persistedState.leads;
  const fileName = persistedState.fileName;
  const csvData = persistedState.csvData;
  const processedCount = persistedState.processedCount;
  const leadStatuses = persistence.leadStatusesMap;
  const leadResponses = persistence.leadResponsesMap;
  const leadPayloads = persistence.leadPayloadsMap;
  const leadDbIds = persistence.leadDbIdsMap;
  const validationErrors = persistence.validationErrorsMap;
  const dbDuplicates = persistence.dbDuplicatesSet;
  const hasValidationErrors = persistedState.hasValidationErrors;
  const duplicateAction = persistedState.duplicateAction;
  const csvHeaders = persistedState.csvHeaders;
  const tempColumnMapping = persistedState.tempColumnMapping;
  const pageSize = persistedState.pageSize;
  const batchId = persistedState.batchId;

  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isBackgroundPolling, setIsBackgroundPolling] = useState(false);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  // ✅ FIX 1: Local state for the mapping dialog - edits are instant, no persistence lag
  const [localColumnMapping, setLocalColumnMapping] = useState<Record<string, string>>({});
  // Persistent user-added custom field names, per-university, stored in localStorage forever
  const [userCustomFields, setUserCustomFields] = useState<string[]>([]);
  const [alert, setAlert] = useState<{ type: "success" | "error" | "info" | "warning"; message: string } | null>(null);
  const [startTime, setStartTime] = useState<number | null>(persistedProcessing.startTime);
  const [showSingleLeadForm, setShowSingleLeadForm] = useState(persistedState.showSingleLeadForm);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [customPageSize, setCustomPageSize] = useState<string>("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [scheduleTime, setScheduleTime] = useState<string>("");
  const [isScheduling, setIsScheduling] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef<boolean>(false);
  const pausedRef = useRef<boolean>(false);
  const currentIndexRef = useRef<number>(persistedProcessing.currentIndex);
  const applyColumnMappingAndProcessRef = useRef<((mapping?: Record<string, string>) => void) | null>(null);
  const pollingRef = useRef<(() => void) | null>(null);
  const isPollingInFlightRef = useRef(false);
  const lastUrlProcessingStateRef = useRef<ProcessingSlugState | null>(null);
  // Refs for polling to avoid stale closures
  const leadsRef = useRef(leads);
  const leadDbIdsRef = useRef(leadDbIds);
  const persistenceRef = useRef(persistence);

  useEffect(() => {
    processingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  // Keep refs in sync for polling
  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);
  useEffect(() => {
    leadDbIdsRef.current = leadDbIds;
  }, [leadDbIds]);
  useEffect(() => {
    persistenceRef.current = persistence;
  }, [persistence]);

  useEffect(() => {
    persistence.setProcessing({
      isProcessing,
      isPaused,
      currentIndex: currentIndexRef.current,
      startTime,
      batchId,
    });

    if (onProcessingStateChange) {
      let slugState: ProcessingSlugState = "idle";
      if (isProcessing && isPaused) {
        slugState = "paused";
      } else if (isProcessing) {
        slugState = "processing";
      } else if (leads.length > 0 && processedCount === leads.length) {
        slugState = "complete";
      }

      if (lastUrlProcessingStateRef.current === slugState) return;
      lastUrlProcessingStateRef.current = slugState;
      onProcessingStateChange(slugState);
    }
  }, [isProcessing, isPaused, startTime, batchId, leads.length, processedCount]);

  // ========== POLLING: Real-time batch & lead status sync from DB ==========
  // Uses refs to avoid stale closures - this function is stable and never recreated
  // Simplified polling - only reads batch aggregate counts (no leads table)
  const pollBatchProgress = useCallback(async (pollBatchId: string) => {
    if (isPollingInFlightRef.current) return;
    isPollingInFlightRef.current = true;

    try {
      const { data: batch } = await supabase
        .from("upload_batches")
        .select("success_count, duplicate_count, fail_count, status, is_paused, is_cancelled, total_leads")
        .eq("id", pollBatchId)
        .maybeSingle();

      if (!batch) return;

      setIsPaused(Boolean(batch.is_paused));

      const processed = (batch.success_count ?? 0) + (batch.duplicate_count ?? 0) + (batch.fail_count ?? 0);
      persistenceRef.current.setState({ processedCount: processed });

      const isBatchComplete =
        batch.status === "completed" ||
        batch.status === "cancelled" ||
        (processed >= (batch.total_leads ?? 0) && (batch.total_leads ?? 0) > 0);

      if (isBatchComplete) {
        if (pollingRef.current) {
          pollingRef.current();
          pollingRef.current = null;
        }
        setIsBackgroundPolling(false);
        setIsProcessing(false);
        setIsPaused(false);

        const success = batch.success_count ?? 0;
        const failed = (batch.fail_count ?? 0) + (batch.duplicate_count ?? 0);
        setAlert({
          type: batch.status === "cancelled" ? "info" : failed === 0 ? "success" : "info",
          message:
            batch.status === "cancelled"
              ? "Processing was cancelled."
              : `Processing complete! Success: ${success}, Failed: ${failed}`,
        });
      }
    } catch (error) {
      console.error("[Polling] Error:", error);
    } finally {
      isPollingInFlightRef.current = false;
    }
  }, []);

  // Start/stop polling when background processing state changes.
  // Uses a Web Worker timer so polling continues when the tab is hidden.
  useEffect(() => {
    const shouldPoll = Boolean(batchId && isBackgroundPolling);

    if (shouldPoll && batchId) {
      pollBatchProgress(batchId);
      pollingRef.current = unthrottledInterval(3000, () => {
        pollBatchProgress(batchId);
      });
    }

    return () => {
      if (pollingRef.current) {
        pollingRef.current();
        pollingRef.current = null;
      }
    };
  }, [batchId, isBackgroundPolling, pollBatchProgress]);

  // Clear stale processing state on page load without starting auto-polling.
  // Polling every few seconds made the upload page look like it was refreshing.
  useEffect(() => {
    if (batchId && persistedProcessing.isProcessing && !isProcessing) {
      setIsBackgroundPolling(false);
      setIsProcessing(false);
      setIsPaused(false);
      setStartTime(null);
    }
  }, []);

  // Hydrate persistent user-added custom fields whenever selected university changes
  useEffect(() => {
    if (!selectedUniversity) { setUserCustomFields([]); return; }
    try {
      const raw = localStorage.getItem(`csv_custom_fields_${selectedUniversity.id}`);
      const arr = raw ? JSON.parse(raw) : [];
      setUserCustomFields(Array.isArray(arr) ? arr.filter((v) => typeof v === "string" && v.trim()) : []);
    } catch { setUserCustomFields([]); }
  }, [selectedUniversity?.id]);

  const addUserCustomField = useCallback((field: string) => {
    if (!selectedUniversity) return;
    const clean = field.trim();
    if (!clean) return;
    setUserCustomFields((prev) => {
      if (prev.includes(clean)) return prev;
      const next = [...prev, clean];
      try {
        localStorage.setItem(`csv_custom_fields_${selectedUniversity.id}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [selectedUniversity?.id]);

  const removeUserCustomField = useCallback((field: string) => {
    if (!selectedUniversity) return;
    setUserCustomFields((prev) => {
      const next = prev.filter((f) => f !== field);
      try {
        localStorage.setItem(`csv_custom_fields_${selectedUniversity.id}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [selectedUniversity?.id]);

  useEffect(() => {
    if (persistedState.selectedUniversityId && universities.length > 0) {
      const found = universities.find((u) => u.id === persistedState.selectedUniversityId);
      if (found && (!selectedUniversity || selectedUniversity.id !== found.id)) {
        setSelectedUniversityState(found);
        if (onSelectUniversity) {
          onSelectUniversity(found);
        }
      }
    }
  }, [universities, persistedState.selectedUniversityId]);

  const setLeads = useCallback(
    (newLeads: Lead[]) => {
      persistence.setLeads(newLeads);
    },
    [persistence],
  );

  const setFileName = useCallback(
    (name: string) => {
      persistence.setState({ fileName: name });
      if (name && onFileUpload) {
        onFileUpload(name);
      }
    },
    [persistence, onFileUpload],
  );

  const setCsvData = useCallback(
    (data: string) => {
      persistence.setState({ csvData: data });
    },
    [persistence],
  );

  const setProcessedCount = useCallback(
    (count: number) => {
      persistence.setState({ processedCount: count });
    },
    [persistence],
  );

  const setLeadStatuses = useCallback(
    (statuses: Map<number, "pending" | "success" | "failed" | "duplicate">) => {
      persistence.setState({
        leadStatuses: Object.fromEntries(statuses.entries()),
      });
    },
    [persistence],
  );

  const setLeadResponses = useCallback(
    (responses: Map<number, string>) => {
      persistence.setState({
        leadResponses: Object.fromEntries(responses.entries()),
      });
    },
    [persistence],
  );

  const setLeadPayloads = useCallback(
    (payloads: Map<number, string>) => {
      persistence.setState({
        leadPayloads: Object.fromEntries(payloads.entries()),
      });
    },
    [persistence],
  );

  const setLeadDbIds = useCallback(
    (dbIds: Map<number, string>) => {
      persistence.setState({
        leadDbIds: Object.fromEntries(dbIds.entries()),
      });
    },
    [persistence],
  );

  const setValidationErrors = useCallback(
    (errors: Map<number, string[]>) => {
      persistence.setState({
        validationErrors: Object.fromEntries(errors.entries()),
        hasValidationErrors: errors.size > 0,
      });
    },
    [persistence],
  );

  const setDbDuplicates = useCallback(
    (duplicates: Set<number>) => {
      persistence.setState({ dbDuplicates: Array.from(duplicates) });
    },
    [persistence],
  );

  const setDuplicateAction = useCallback(
    (action: "skip" | "process") => {
      persistence.setState({ duplicateAction: action });
    },
    [persistence],
  );

  const setCsvHeaders = useCallback(
    (headers: string[]) => {
      persistence.setState({ csvHeaders: headers });
    },
    [persistence],
  );

  const setTempColumnMapping = useCallback(
    (mapping: Record<string, string>) => {
      persistence.setState({ tempColumnMapping: mapping });
    },
    [persistence],
  );

  const setPageSize = useCallback(
    (size: number) => {
      persistence.setState({ pageSize: size });
    },
    [persistence],
  );

  const setBatchId = useCallback(
    (id: string | null) => {
      persistence.setState({ batchId: id });
    },
    [persistence],
  );

  const normalizeUpgradMobile = (value: string) => {
    const rawMobile = (value || "").toString().trim();
    let countryCode = "+91";
    let number = rawMobile.replace(/\D/g, "");
    const plusMatch = rawMobile.match(/^\+(\d{1,3})/);
    if (plusMatch) {
      countryCode = `+${plusMatch[1]}`;
      number = number.slice(plusMatch[1].length);
    } else if (number.length === 12 && number.startsWith("91")) {
      number = number.slice(2);
    } else if (number.length === 11 && number.startsWith("0")) {
      number = number.slice(1);
    }
    return { countryCode, number };
  };

  const normalizeUpgradLead = (lead: Lead): Lead => {
    if ((selectedUniversity?.api_type || "") !== "upgrad") return lead;
    const phone = normalizeUpgradMobile(lead["phone.number"] || lead.mobile || "");
    const programOfInterest = slugifyUpgradCourse(lead.programOfInterest || lead.course || lead.specialization || "");
    return {
      ...lead,
      name: lead.name || [lead.firstname, lead.lastname].filter(Boolean).join(" ").trim(),
      mobile: phone.number,
      "phone.code": lead["phone.code"] || lead["phone.countryCode"] || phone.countryCode,
      "phone.number": phone.number,
      course: lead.course || programOfInterest,
      country: lead.country || "India",
      sendWelcomeMail: "true",
      isDetectLocation: lead.isDetectLocation || "false",
      affiliateSource: lead.affiliateSource || "aff_id=1&sub_aff_id=12",
      "leadSource.platform": lead["leadSource.platform"] || "",
      "leadSource.platformSection": lead["leadSource.platformSection"] || "",
      "extraFields.chatLink": lead["extraFields.chatLink"] || "haptik.com/1234567",
      emailTemplateSuffix: lead.emailTemplateSuffix || "in",
    };
  };

  const slugifyUpgradCourse = (value: string) =>
    (value || "").toString().trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "");

  const buildMappedPayloadPreview = (lead: Lead): string => {
    if (!selectedUniversity) return "";

    const apiType = selectedUniversity.api_type || "nopaperforms";
    const columnMapping = selectedUniversity.column_mapping || {};
    const customColumns = selectedUniversity.customColumns || [];

    const customColumnApiMapping: Record<string, string> = {};
    customColumns.forEach((col: any) => {
      if (col.columnKey && col.apiFieldName) {
        customColumnApiMapping[col.columnKey] = col.apiFieldName;
      }
    });

    const entries = Object.entries(lead).filter(([, v]) => typeof v === "string" && v.trim()) as Array<
      [string, string]
    >;

    if (apiType === "leadsquared") {
      const payload = entries.map(([key, value]) => ({
        Attribute: customColumnApiMapping[key] || columnMapping[key] || key,
        Value: value,
      }));
      return JSON.stringify(payload, null, 2);
    }

    if (apiType === "upgrad") {
      const upgradMeta: Record<string, string> = {};
      Object.entries(columnMapping).forEach(([key, value]) => {
        if (key.startsWith("__upgrad_meta_") && value) upgradMeta[key.replace("__upgrad_meta_", "")] = value;
      });
      const get = (upgradField: string, fallbackField: string) => {
        const mappedKey = (columnMapping as any)[`__upgrad_src_${upgradField}`] || fallbackField;
        return ((lead as any)[mappedKey] || (lead as any)[upgradField] || (lead as any)[fallbackField] || "").toString();
      };
      const fullName = (get("firstname", "name") || lead.name || "").trim();
      const parts = fullName.split(/\s+/).filter(Boolean);
      const firstname = (lead.firstname || parts.shift() || fullName || "Lead").trim();
      const lastname =
        lead.lastname ||
        ((columnMapping as any).__upgrad_src_lastname && (lead as any)[(columnMapping as any).__upgrad_src_lastname]) ||
        parts.join(" ") ||
        firstname;
      const phone = normalizeUpgradMobile(lead["phone.number"] || get("mobile", "mobile"));
      const course = (lead.course || lead.programOfInterest || get("course", "course") || get("specialization", "specialization")).toString().trim();
      const upPayload: Record<string, unknown> = {
        firstname,
        lastname,
        email: get("email", "email"),
        phone: {
          number: phone.number,
          code: lead["phone.code"] || lead["phone.countryCode"] || phone.countryCode,
        },
        course,
        sendWelcomeMail: true,
        city: get("city", "city"),
        state: get("state", "state"),
        country: lead.country || upgradMeta.country || "India",
        isDetectLocation: false,
        affiliateSource: lead.affiliateSource || upgradMeta.affiliateSource || "aff_id=1&sub_aff_id=12",
        leadSource: {
          platform: lead["leadSource.platform"] || "",
          platformSection: lead["leadSource.platformSection"] || "",
        },
        extraFields: {
          chatLink: lead["extraFields.chatLink"] || upgradMeta.chatLink || "haptik.com/1234567",
        },
        emailTemplateSuffix: lead.emailTemplateSuffix || upgradMeta.emailTemplateSuffix || "in",
      };
      Object.entries(columnMapping).forEach(([k, v]) => {
        if (k.startsWith("__static_") && v) {
          const fullKey = k.replace("__static_", "");
          if (["extraFields.LSQID", "sendWelcomeMail", "isDetectLocation"].includes(fullKey)) return;
          if (fullKey.includes(".")) {
            const segs = fullKey.split(".");
            let cur: any = upPayload;
            for (let i = 0; i < segs.length - 1; i++) {
              if (typeof cur[segs[i]] !== "object" || cur[segs[i]] === null) cur[segs[i]] = {};
              cur = cur[segs[i]];
            }
            cur[segs[segs.length - 1]] = v;
          } else {
            (upPayload as any)[fullKey] = v;
          }
        }
      });
      return JSON.stringify(upPayload, null, 2);
    }

    if (apiType === "meritto" || apiType === "nopaperforms") {
      const payload: Record<string, string> = {
        secret_key: selectedUniversity.secret_key ? "[hidden]" : "",
        source: lead.leadSource?.trim() || selectedUniversity.source,
        medium: lead.leadMedium?.trim() || selectedUniversity.medium,
        campaign: lead.leadCampaign?.trim() || selectedUniversity.campaign,
      };

      entries.forEach(([key, value]) => {
        const mappedKey = customColumnApiMapping[key] || columnMapping[key] || key;
        if (!["leadSource", "leadMedium", "leadCampaign"].includes(key)) {
          payload[mappedKey] = value;
        }
      });

      return JSON.stringify(payload, null, 2);
    }

    const payload: Record<string, string> = {};

    const hasSourceMapping = Object.keys(columnMapping).some((k) => k === "leadSource" || k === "source");
    const hasMediumMapping = Object.keys(columnMapping).some((k) => k === "leadMedium" || k === "medium");
    const hasCampaignMapping = Object.keys(columnMapping).some((k) => k === "leadCampaign" || k === "campaign");

    if (hasSourceMapping) {
      const sourceVal = lead.leadSource?.trim() || selectedUniversity.source || "";
      if (sourceVal) payload[columnMapping["leadSource"] || columnMapping["source"] || "source"] = sourceVal;
    }
    if (hasMediumMapping) {
      const mediumVal = lead.leadMedium?.trim() || selectedUniversity.medium || "";
      if (mediumVal) payload[columnMapping["leadMedium"] || columnMapping["medium"] || "medium"] = mediumVal;
    }
    if (hasCampaignMapping) {
      const campaignVal = lead.leadCampaign?.trim() || selectedUniversity.campaign || "";
      if (campaignVal) payload[columnMapping["leadCampaign"] || columnMapping["campaign"] || "campaign"] = campaignVal;
    }

    entries.forEach(([key, value]) => {
      if (!["leadSource", "leadMedium", "leadCampaign"].includes(key)) {
        if (customColumnApiMapping[key]) {
          payload[customColumnApiMapping[key]] = value;
          return;
        }
        if (columnMapping[key]) {
          payload[columnMapping[key]] = value;
          return;
        }
        payload[key] = value;
      }
    });

    if (columnMapping) {
      Object.entries(columnMapping).forEach(([key, value]) => {
        if (key.startsWith("__static_")) {
          payload[key.replace("__static_", "")] = value;
        }
      });
    }

    const finalPayload = selectedUniversity.payload_wrapper === "array" ? [payload] : payload;
    return JSON.stringify(finalPayload, null, 2);
  };

  const handleUniversityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const uni = universities.find((u) => u.id === e.target.value);
    setSelectedUniversityState(uni || null);
    if (uni && onSelectUniversity) {
      onSelectUniversity(uni);
    }
    clearAll();
  };

  const handleRateLimitUpdate = (newRate: number) => {
    if (selectedUniversity) {
      setSelectedUniversityState({ ...selectedUniversity, leads_per_minute: newRate });
    }
  };

  const handleFileUploadEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUniversity) return;

    setFileName(file.name);

    if (onFileUpload) {
      onFileUpload(file.name);
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvData(text);

      const isUpgradCsv = (selectedUniversity.api_type || "") === "upgrad";
      const { data, headers } = parseCSV(text, { preserveHeaders: isUpgradCsv });
      setCsvHeaders(headers);

      // upGrad-specific pre-flight CSV validation (non-blocking warnings)
      if (isUpgradCsv) {
        const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
        const required = ["firstname", "email", "phone.number", "phone.code", "course"];
        const missing = required.filter((r) => !lowerHeaders.includes(r));
        const issues: string[] = [];
        if (missing.length) {
          issues.push(`Missing exact upGrad column(s): ${missing.join(", ")}. Download the upGrad sample and keep these JSON-style headers unchanged.`);
        }
        const mobileKey = headers.find((h) => h.toLowerCase().trim() === "phone.number");
        const courseKey = headers.find((h) => h.toLowerCase().trim() === "course");
        let badMobiles = 0;
        let badCourses = 0;
        let emptyRows = 0;
        data.forEach((row) => {
          const allEmpty = Object.values(row).every((v) => !v || !String(v).trim());
          if (allEmpty) { emptyRows++; return; }
          if (mobileKey) {
            const digits = String(row[mobileKey] || "").replace(/\D/g, "");
            const normalized = digits.length === 12 && digits.startsWith("91")
              ? digits.slice(2)
              : digits.length === 11 && digits.startsWith("0")
                ? digits.slice(1)
                : digits;
            if (normalized.length !== 10) badMobiles++;
          }
          if (courseKey) {
            const v = String(row[courseKey] || "").trim();
            if (v && !/^[a-z0-9-]+$/.test(v)) badCourses++;
          }
        });
        if (badMobiles) issues.push(`${badMobiles} row(s) have mobile numbers that aren't 10-digit Indian format (will be auto-normalized; +91/0 prefixes stripped).`);
        if (badCourses) issues.push(`${badCourses} row(s) use course values with spaces/special characters. Keep course exactly as upGrad JSON expects, e.g. entrepreneurship.`);
        if (emptyRows) issues.push(`${emptyRows} empty row(s) detected - they will be skipped.`);
        if (issues.length) {
          setAlert({
            type: missing.length ? "error" : "warning",
            message: `upGrad CSV check: ${issues.join(" ")}`,
          });
          if (missing.length) return;
        }
      }

      const customColumnKeys = (selectedUniversity.customColumns || []).map((col) => ({
        key: col.columnKey?.toLowerCase(),
        name: col.columnName?.toLowerCase(),
        originalKey: col.columnKey,
      }));

      // Check for saved mapping for this university
      const savedMappingKey = `csv_mapping_${selectedUniversity.id}`;
      const savedMappingRaw = localStorage.getItem(savedMappingKey);
      let savedMapping: Record<string, string> | null = null;
      try {
        if (savedMappingRaw) savedMapping = JSON.parse(savedMappingRaw);
      } catch {
        /* ignore */
      }

      // ✅ FIX 2: Always show mapping dialog - pre-fill with saved mapping if available
      if (savedMapping && headers.every((h) => h in savedMapping)) {
        setLocalColumnMapping(savedMapping);
        (window as any).__pendingCsvData = data;
        setShowColumnMapping(true);
        return;
      }

      const initialMapping: Record<string, string> = {};
      const usedFields = new Set<string>();
      headers.forEach((header) => {
        const normalizedHeader = header.toLowerCase().trim();

        if ((selectedUniversity.api_type || "") === "upgrad" && UPGRAD_EXACT_FIELDS.includes(header)) {
          initialMapping[header] = header;
          usedFields.add(header);
          return;
        }

        const matchedCustomCol = customColumnKeys.find(
          (col) => col.key === normalizedHeader || col.name === normalizedHeader,
        );
        if (matchedCustomCol && !usedFields.has(matchedCustomCol.originalKey)) {
          initialMapping[header] = matchedCustomCol.originalKey;
          usedFields.add(matchedCustomCol.originalKey);
          return;
        }

        const existingMappedKey = Object.entries(selectedUniversity.column_mapping || {}).find(([key, value]) => {
          const cleanKey = key.startsWith("__") ? "" : key.toLowerCase();
          const cleanValue = typeof value === "string" ? value.toLowerCase() : "";
          return cleanKey === normalizedHeader || cleanValue === normalizedHeader;
        });
        if (existingMappedKey && !existingMappedKey[0].startsWith("__") && !usedFields.has(existingMappedKey[0])) {
          initialMapping[header] = existingMappedKey[0];
          usedFields.add(existingMappedKey[0]);
        } else {
          let autoField = "";
          if (["name", "full_name", "fullname", "student_name", "student name"].includes(normalizedHeader)) {
            autoField = "name";
          } else if (
            ["email", "email_id", "emailaddress", "email_address", "email address"].includes(normalizedHeader)
          ) {
            autoField = "email";
          } else if (
            ["mobile", "phone", "mobile_number", "phone_number", "contact", "phone number", "mobile number"].includes(
              normalizedHeader,
            )
          ) {
            autoField = "mobile";
          } else if (["state", "state_name", "state name"].includes(normalizedHeader)) {
            autoField = "state";
          } else if (["city", "city_name", "city name"].includes(normalizedHeader)) {
            autoField = "city";
          } else if (["course", "program", "course_name", "course name", "programme"].includes(normalizedHeader)) {
            autoField = "course";
          } else if (["specialization", "specialisation", "branch", "stream", "spec"].includes(normalizedHeader)) {
            autoField = "specialization";
          } else if (["source", "lead_source", "utm_source", "lead source"].includes(normalizedHeader)) {
            autoField = "leadSource";
          } else if (["medium", "lead_medium", "utm_medium", "lead medium"].includes(normalizedHeader)) {
            autoField = "leadMedium";
          } else if (["campaign", "lead_campaign", "utm_campaign", "lead campaign"].includes(normalizedHeader)) {
            autoField = "leadCampaign";
          } else if (["address", "full_address", "street_address", "full address"].includes(normalizedHeader)) {
            autoField = "address";
          }

          if (autoField && !usedFields.has(autoField)) {
            initialMapping[header] = autoField;
            usedFields.add(autoField);
          } else {
            initialMapping[header] = "";
          }
        }
      });

      // ✅ FIX 3: Set localColumnMapping (not persistence) so dialog edits work instantly
      setLocalColumnMapping(initialMapping);
      setShowColumnMapping(true);
      (window as any).__pendingCsvData = data;
    };

    reader.readAsText(file);
  };

  // ✅ FIX 4: Accept mappingOverride so the "Apply" button passes localColumnMapping directly
  const applyColumnMappingAndProcess = useCallback(
    (mappingOverride?: Record<string, string>) => {
      const rawData = (window as any).__pendingCsvData;
      if (!rawData || !selectedUniversity) return;

      const activeMapping = mappingOverride ?? tempColumnMapping;
      if (!Array.isArray(rawData) || rawData.length === 0) {
        setAlert({ type: "error", message: "No lead rows found in this file. Please upload a CSV or tab-separated file with at least one data row." });
        return;
      }

      const fixedDefaults: Record<string, string> = {};
      Object.entries(selectedUniversity.column_mapping || {}).forEach(([key, value]) => {
        if (key.startsWith("__fixed_") && value) {
          fixedDefaults[key.replace("__fixed_", "")] = value;
        }
      });

      // Persist the mapping to localStorage for next upload
      const savedMappingKey = `csv_mapping_${selectedUniversity.id}`;
      localStorage.setItem(savedMappingKey, JSON.stringify(activeMapping));
      // Also sync to persistence state
      setTempColumnMapping(activeMapping);

      const mappedLeads: Lead[] = rawData.map((row: Record<string, string>) => {
        const lead: Partial<Lead> = { ...fixedDefaults };

        Object.entries(activeMapping).forEach(([csvHeader, targetField]) => {
          const value = row[csvHeader];
          if (value && targetField && targetField.trim() !== "") {
            (lead as any)[targetField] = value;
          }
        });

        const locationValue = row.location || row.Location || row.LOCATION || "";
        if (locationValue && (!lead.city?.trim() || !lead.state?.trim())) {
          const [cityPart, ...stateParts] = locationValue.split(",").map((part) => part.trim()).filter(Boolean);
          if (!lead.city?.trim() && cityPart) lead.city = cityPart;
          if (!lead.state?.trim() && stateParts.length > 0) lead.state = stateParts.join(", ");
        }

        if ((selectedUniversity.api_type || "") === "upgrad") {
          if (!lead.firstname?.trim() && lead.name?.trim()) {
            const [first, ...rest] = lead.name.trim().split(/\s+/);
            lead.firstname = first || "";
            lead.lastname = lead.lastname || rest.join(" ") || first || "";
          }
          if (!lead.name?.trim()) lead.name = [lead.firstname, lead.lastname].filter(Boolean).join(" ").trim();
        }

        if (!lead.leadSource?.trim() && selectedUniversity.source?.trim()) lead.leadSource = selectedUniversity.source;
        if (!lead.leadMedium?.trim() && selectedUniversity.medium?.trim()) lead.leadMedium = selectedUniversity.medium;
        if (!lead.leadCampaign?.trim() && selectedUniversity.campaign?.trim())
          lead.leadCampaign = selectedUniversity.campaign;

        return normalizeUpgradLead(lead as Lead);
      });

      const payloadMap = new Map<number, string>();
      mappedLeads.forEach((lead, idx) => {
        payloadMap.set(idx, buildMappedPayloadPreview(lead));
      });
      setLeadPayloads(payloadMap);

      const validationConfig = buildValidationConfigFromUniversity({
        customColumns: selectedUniversity.customColumns,
      });

      const { invalidLeads, hasDuplicates } = validateLeads(mappedLeads, validationConfig);

      const errorMap = new Map<number, string[]>();
      invalidLeads.forEach(({ index, errors }) => {
        errorMap.set(index, errors);
      });

      setValidationErrors(errorMap);

      if (invalidLeads.length > 0) {
        setAlert({
          type: "warning",
          message: `${invalidLeads.length} lead(s) have validation errors. ${hasDuplicates ? "Duplicates detected!" : ""} Review and fix before processing.`,
        });
      } else if (hasDuplicates) {
        setAlert({
          type: "warning",
          message: "Duplicate emails or mobile numbers detected in CSV. These may be rejected by the API.",
        });
      }

      setLeads(mappedLeads);
      setLeadStatuses(new Map());
      setLeadResponses(new Map());
      setDbDuplicates(new Set());
      setProcessedCount(0);
      currentIndexRef.current = 0;
      setShowColumnMapping(false);
      setLocalColumnMapping({});
      delete (window as any).__pendingCsvData;
    },
    [
      selectedUniversity,
      tempColumnMapping,
      buildMappedPayloadPreview,
      setLeadPayloads,
      setValidationErrors,
      setLeads,
      setLeadStatuses,
      setLeadResponses,
      setDbDuplicates,
      setProcessedCount,
      setTempColumnMapping,
      normalizeUpgradLead,
    ],
  );

  useEffect(() => {
    applyColumnMappingAndProcessRef.current = applyColumnMappingAndProcess;
  }, [applyColumnMappingAndProcess]);

  const checkDbDuplicates = async () => {
    if (!selectedUniversity || leads.length === 0) return;

    setIsCheckingDuplicates(true);
    try {
      const { emails, mobiles } = await checkDatabaseDuplicates(leads, selectedUniversity.id, supabase);

      const duplicateIndices = new Set<number>();
      leads.forEach((lead, index) => {
        const normalizedEmail = lead.email?.trim().toLowerCase();
        const normalizedMobile = lead.mobile?.replace(/[\s\-().+]/g, "");

        if ((normalizedEmail && emails.has(normalizedEmail)) || (normalizedMobile && mobiles.has(normalizedMobile))) {
          duplicateIndices.add(index);
        }
      });

      setDbDuplicates(duplicateIndices);

      if (duplicateIndices.size > 0) {
        setAlert({
          type: "warning",
          message: `Found ${duplicateIndices.size} lead(s) that already exist in database. You can skip or process them.`,
        });
      } else {
        setAlert({
          type: "success",
          message: "No duplicates found in database. Ready to process!",
        });
      }
    } catch (error) {
      console.error("Error checking duplicates:", error);
      setAlert({ type: "error", message: "Failed to check for duplicates" });
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleUpdateLead = (index: number, updatedLead: Lead) => {
    const newLeads = [...leads];
    newLeads[index] = updatedLead;
    setLeads(newLeads);

    const newPayloads = new Map(leadPayloads);
    newPayloads.set(index, buildMappedPayloadPreview(updatedLead));
    setLeadPayloads(newPayloads);

    const validationConfig = selectedUniversity
      ? buildValidationConfigFromUniversity({
          customColumns: selectedUniversity.customColumns,
        })
      : undefined;
    const { invalidLeads } = validateLeads([updatedLead], validationConfig);
    const newErrors = new Map(validationErrors);

    if (invalidLeads.length > 0) {
      newErrors.set(index, invalidLeads[0].errors);
    } else {
      newErrors.delete(index);
    }

    setValidationErrors(newErrors);
  };

  const exportFailedLeads = () => {
    const failedLeads = leads.filter((_, index) => leadStatuses.get(index) === "failed");
    if (failedLeads.length === 0) return;

    const csvContent = generateLeadsCSV(failedLeads);
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `failed_leads_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSampleCSV = () => {
    const isUpgrad = (selectedUniversity?.api_type || "") === "upgrad";
    const content = isUpgrad ? UPGRAD_EXACT_SAMPLE_CSV : generateSampleCSV();
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = isUpgrad ? "upgrad_sample_leads.csv" : "sample_leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const createBatch = async (status: string = "processing") => {
    if (!selectedUniversity) return null;

    // Don't save CSV data to reduce storage usage
    const { data, error } = await supabase
      .from("upload_batches")
      .insert({
        university_id: selectedUniversity.id,
        file_name: fileName,
        total_leads: leads.length,
        csv_data: null, // No longer saving CSV to reduce cloud storage
        status,
        is_paused: false,
        is_cancelled: false,
        processed_count: 0,
        current_lead_index: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating batch:", error);
      return null;
    }
    return data.id;
  };

  // Frontend-driven processing - no leads saved to database
  const startBackgroundProcessing = async () => {
    if (!selectedUniversity || leads.length === 0) return;

    processingRef.current = true;
    setIsProcessing(true);
    setStartTime(Date.now());
    setAlert({ type: "info", message: `Processing ${leads.length} leads...` });

    try {
      const newBatchId = await createBatch("processing");
      if (!newBatchId) {
        setAlert({ type: "error", message: "Failed to create batch" });
        setIsProcessing(false);
        processingRef.current = false;
        return;
      }
      setBatchId(newBatchId);

      const apiConfig = getApiConfig();
      const leadsPerMinute = selectedUniversity.leads_per_minute || 5;
      const delayMs = Math.max(Math.round(60000 / leadsPerMinute), 200);

      const statuses = new Map<number, LeadProcessingStatus>();
      const responses = new Map<number, string>();
      let processed = 0;

      for (let i = 0; i < leads.length; i++) {
        if (!processingRef.current) break;

        // Wait while paused (worker timer so it keeps ticking on hidden tab)
        while (pausedRef.current && processingRef.current) {
          await unthrottledWait(500);
        }
        if (!processingRef.current) break;

        const lead = leads[i];
        currentIndexRef.current = i;

        try {
          const result = await processLead(lead, i, newBatchId, apiConfig);

          const status: LeadProcessingStatus =
            result.status === "Success" ? "success" : result.status === "Duplicate" ? "duplicate" : "failed";

          statuses.set(i, status);
          responses.set(i, result.response);
        } catch (err) {
          statuses.set(i, "failed");
          responses.set(i, String(err));
        }

        processed++;
        setLeadStatuses(new Map(statuses));
        setLeadResponses(new Map(responses));
        setProcessedCount(processed);

        // Rate limiting delay - worker timer keeps firing on hidden tabs
        if (i < leads.length - 1 && processingRef.current) {
          await unthrottledWait(delayMs);
        }
      }

      // Mark batch complete
      if (processingRef.current) {
        await supabase
          .from("upload_batches")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            processed_count: processed,
          })
          .eq("id", newBatchId);
      }

      processingRef.current = false;
      setIsProcessing(false);

      const successCount = [...statuses.values()].filter((s) => s === "success").length;
      const failCount = [...statuses.values()].filter((s) => s === "failed").length;
      const dupCount = [...statuses.values()].filter((s) => s === "duplicate").length;

      setAlert({
        type: failCount === 0 ? "success" : "info",
        message: `Complete! Success: ${successCount}, Failed: ${failCount}, Duplicate: ${dupCount}`,
      });
    } catch (error) {
      console.error("Processing error:", error);
      setAlert({ type: "error", message: "Processing failed: " + String(error) });
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Schedule leads for background server-side processing
  const scheduleProcessing = async (scheduledAt: Date) => {
    if (!selectedUniversity || leads.length === 0) return;

    setIsScheduling(true);
    try {
      const apiConfig = getApiConfig();

      // Create batch with scheduled status
      const { data: batchData, error: batchError } = await supabase
        .from("upload_batches")
        .insert({
          university_id: selectedUniversity.id,
          file_name: fileName,
          total_leads: leads.length,
          csv_data: null,
          status: "scheduled",
          is_paused: false,
          is_cancelled: false,
          processed_count: 0,
          current_lead_index: 0,
          scheduled_at: scheduledAt.toISOString(),
          leads_per_minute: selectedUniversity.leads_per_minute || 5,
          api_config: apiConfig,
        })
        .select()
        .single();

      if (batchError || !batchData) {
        setAlert({
          type: "error",
          message: "Failed to create scheduled batch: " + (batchError?.message || "Unknown error"),
        });
        setIsScheduling(false);
        return;
      }

      // Save all leads to the leads table for server-side processing
      const leadsToInsert = leads.map((lead) => {
        const extraData: Record<string, string> = {};
        Object.entries(lead).forEach(([key, value]) => {
          if (
            value &&
            ![
              "name",
              "email",
              "mobile",
              "address",
              "state",
              "city",
              "course",
              "specialization",
              "leadSource",
              "leadMedium",
              "leadCampaign",
            ].includes(key)
          ) {
            extraData[key] = value;
          }
        });

        return {
          batch_id: batchData.id,
          university_id: selectedUniversity.id,
          name: lead.name || "",
          email: lead.email || "",
          mobile: lead.mobile || "",
          address: lead.address || null,
          state: lead.state || null,
          city: lead.city || null,
          course: lead.course || null,
          specialization: lead.specialization || null,
          lead_source: lead.leadSource || selectedUniversity.source || null,
          lead_medium: lead.leadMedium || selectedUniversity.medium || null,
          lead_campaign: lead.leadCampaign || selectedUniversity.campaign || null,
          extra_data: Object.keys(extraData).length > 0 ? extraData : {},
          status: "pending",
        };
      });

      // Insert leads in chunks of 500
      const chunkSize = 500;
      for (let i = 0; i < leadsToInsert.length; i += chunkSize) {
        const chunk = leadsToInsert.slice(i, i + chunkSize);
        const { error: insertError } = await supabase.from("push_leads").insert(chunk);
        if (insertError) {
          console.error("Error inserting leads chunk:", insertError);
          setAlert({ type: "error", message: "Failed to save leads for scheduling: " + insertError.message });
          // Clean up the batch
          await supabase.from("upload_batches").delete().eq("id", batchData.id);
          setIsScheduling(false);
          return;
        }
      }

      setAlert({
        type: "success",
        message: `Scheduled ${leads.length} leads for ${scheduledAt.toLocaleString()}. Processing will start automatically - no need to keep the app open.`,
      });
      clearAll();
    } catch (error) {
      console.error("Schedule error:", error);
      setAlert({ type: "error", message: "Failed to schedule: " + String(error) });
    } finally {
      setIsScheduling(false);
      setShowScheduleModal(false);
    }
  };

  // Pre-compute apiConfig once per university to avoid redundant work per lead
  const getApiConfig = useCallback(() => {
    if (!selectedUniversity) return null;
    const customColumnApiMapping: Record<string, string> = {};
    (selectedUniversity.customColumns || []).forEach((col: any) => {
      if (col.columnKey && col.apiFieldName) {
        customColumnApiMapping[col.columnKey] = col.apiFieldName;
      }
    });

    return {
      apiUrl: selectedUniversity.api_url,
      secretKey: selectedUniversity.secret_key,
      collegeId: selectedUniversity.college_id,
      source: selectedUniversity.source,
      medium: selectedUniversity.medium,
      campaign: selectedUniversity.campaign,
      apiType: selectedUniversity.api_type || "nopaperforms",
      columnMapping: selectedUniversity.column_mapping || {},
      customColumnMapping: customColumnApiMapping,
      payloadWrapper: selectedUniversity.payload_wrapper || "object",
      authType: selectedUniversity.auth_type || "secret_key",
      authHeaderKey: selectedUniversity.auth_header_key || "",
      authHeaderValue: selectedUniversity.auth_header_value || "",
      customHeaders: selectedUniversity.custom_headers || {},
      universityDefaults: {}, // Will be resolved by edge function only if needed
    };
  }, [selectedUniversity]);

  // Direct edge function call - no leads table insert
  const processLead = async (
    lead: Lead,
    _index: number,
    batchIdParam: string,
    precomputedApiConfig?: ReturnType<typeof getApiConfig>,
  ): Promise<{ success: boolean; status: string; response: string }> => {
    if (!selectedUniversity) return { success: false, status: "Fail", response: "No university selected" };

    try {
      const apiConfig = precomputedApiConfig || getApiConfig();

      const { data, error } = await supabase.functions.invoke("process-lead", {
        body: {
          universityId: selectedUniversity.id,
          batchId: batchIdParam,
          leadData: {
            ...lead,
            leadSource: lead.leadSource || selectedUniversity.source,
            leadMedium: lead.leadMedium || selectedUniversity.medium,
            leadCampaign: lead.leadCampaign || selectedUniversity.campaign,
          },
          apiConfig,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        return { success: false, status: "Fail", response: error.message };
      }

      return {
        success: data?.status === "Success",
        status: data?.status || "Fail",
        response: data?.response || "No response",
      };
    } catch (error) {
      console.error("Process lead error:", error);
      return { success: false, status: "Fail", response: String(error) };
    }
  };

  const checkBatchStatus = async (batchIdToCheck: string): Promise<{ isPaused: boolean; isCancelled: boolean }> => {
    const { data } = await supabase
      .from("upload_batches")
      .select("is_paused, is_cancelled")
      .eq("id", batchIdToCheck)
      .maybeSingle();
    return {
      isPaused: data?.is_paused ?? false,
      isCancelled: data?.is_cancelled ?? false,
    };
  };

  const processLeads = useCallback(async () => {
    if (!selectedUniversity || leads.length === 0) return;

    // Always use background processing for reliable progress tracking
    setAlert({
      type: "info",
      message: `Queuing ${leads.length} leads for background processing...`,
    });
    await startBackgroundProcessing();
  }, [selectedUniversity, leads, startBackgroundProcessing]);

  const pauseProcessing = async () => {
    pausedRef.current = true;
    setIsPaused(true);
    setAlert({ type: "info", message: "Processing paused. Click resume to continue." });
    if (batchId) {
      supabase.from("upload_batches").update({ is_paused: true, status: "paused" }).eq("id", batchId).then();
    }
  };

  const resumeProcessing = async () => {
    // Just flip the pause flag - the local loop in startBackgroundProcessing
    // is already waiting on `pausedRef.current` via unthrottledWait(500).
    // We must NOT invoke `process-queue` here: the server-side dispatcher
    // would race the local loop and double-send every remaining lead.
    pausedRef.current = false;
    setIsPaused(false);
    setAlert({ type: "info", message: "Resumed. Continuing where it left off..." });
    if (batchId) {
      supabase
        .from("upload_batches")
        .update({ is_paused: false, status: "processing" })
        .eq("id", batchId)
        .then();
    }
  };

  const stopProcessing = async () => {
    processingRef.current = false;
    pausedRef.current = false;
    setIsProcessing(false);
    setIsPaused(false);
    setIsBackgroundPolling(false);
    if (pollingRef.current) {
      pollingRef.current();
      pollingRef.current = null;
    }
    setAlert({ type: "info", message: "Processing stopped. Remaining leads cancelled." });
    if (batchId) {
      supabase.from("upload_batches").update({ status: "cancelled", is_cancelled: true }).eq("id", batchId).then();
    }
  };

  const retryLead = async (index: number) => {
    if (!selectedUniversity || !batchId) return;

    const statuses = new Map(leadStatuses);
    const responses = new Map(leadResponses);
    statuses.set(index, "pending");
    setLeadStatuses(new Map(statuses));

    const lead = leads[index];
    const result = await processLead(lead, index, batchId);

    const retryStatus =
      result.status === "Success" ? "success" : result.status === "Duplicate" ? "duplicate" : "failed";
    statuses.set(index, retryStatus);
    responses.set(index, result.response);
    setLeadStatuses(new Map(statuses));
    setLeadResponses(new Map(responses));
  };

  const bulkRetryFailed = async () => {
    if (!selectedUniversity || !batchId) return;

    setIsProcessing(true);
    const statuses = new Map(leadStatuses);
    const responses = new Map(leadResponses);
    const failedIndices = [...statuses.entries()].filter(([_, s]) => s === "failed").map(([i]) => i);
    const precomputedApiConfig = getApiConfig();
    const targetIntervalMs = Math.round(60000 / (selectedUniversity.leads_per_minute || 5));

    for (const index of failedIndices) {
      statuses.set(index, "pending");
      setLeadStatuses(new Map(statuses));

      const startTime = Date.now();
      const lead = leads[index];
      const result = await processLead(lead, index, batchId, precomputedApiConfig);

      const bulkRetryStatus =
        result.status === "Success" ? "success" : result.status === "Duplicate" ? "duplicate" : "failed";
      statuses.set(index, bulkRetryStatus);
      responses.set(index, result.response);
      setLeadStatuses(new Map(statuses));
      setLeadResponses(new Map(responses));

      // Rate-adjusted delay - worker timer keeps ticking on hidden tabs
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, targetIntervalMs - elapsed);
      if (remainingDelay > 0) {
        await unthrottledWait(remainingDelay);
      }
    }

    setIsProcessing(false);
    const successCount = [...statuses.values()].filter((s) => s === "success").length;
    const stillFailed = [...statuses.values()].filter((s) => s === "failed").length;
    setAlert({
      type: stillFailed === 0 ? "success" : "info",
      message: `Retry complete! ${successCount} total succeeded, ${stillFailed} still failed.`,
    });
  };

  const clearAll = () => {
    processingRef.current = false;
    pausedRef.current = false;
    setIsBackgroundPolling(false);
    if (pollingRef.current) {
      pollingRef.current();
      pollingRef.current = null;
    }
    setLeads([]);
    setFileName("");
    setCsvData("");
    setLeadStatuses(new Map());
    setLeadResponses(new Map());
    setLeadPayloads(new Map());
    setValidationErrors(new Map());
    setDbDuplicates(new Set());
    setProcessedCount(0);
    setBatchId(null);
    setIsProcessing(false);
    setIsPaused(false);
    setStartTime(null);
    currentIndexRef.current = 0;
    setCsvHeaders([]);
    setTempColumnMapping({});
    // ✅ FIX 5: Reset local mapping state on clear
    setLocalColumnMapping({});
    setShowColumnMapping(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePageSizeChange = (size: number | "custom") => {
    if (size === "custom") {
      const customVal = parseInt(customPageSize, 10);
      if (customVal > 0 && customVal <= leads.length) {
        setPageSize(customVal);
      }
    } else {
      setPageSize(size);
    }
  };

  const rawFailedCount = [...leadStatuses.values()].filter((s) => s === "failed").length;
  const duplicateCount = [...leadStatuses.values()].filter((s) => s === "duplicate").length;
  const successCount = [...leadStatuses.values()].filter((s) => s === "success").length;
  const failedCount = rawFailedCount + duplicateCount;
  const processedDisplayCount = successCount + failedCount;
  const pendingCount = Math.max(leads.length - processedDisplayCount, 0);

  const getEstimatedTime = () => {
    if (!startTime || !selectedUniversity || processedDisplayCount === 0) return null;
    const elapsed = (Date.now() - startTime) / 1000;
    const avgTimePerLead = elapsed / processedDisplayCount;
    const secondsRemaining = Math.round(pendingCount * avgTimePerLead);

    if (secondsRemaining < 60) return `${secondsRemaining}s remaining`;
    if (secondsRemaining < 3600) return `${Math.round(secondsRemaining / 60)}m remaining`;
    return `${Math.round(secondsRemaining / 3600)}h ${Math.round((secondsRemaining % 3600) / 60)}m remaining`;
  };

  const showUploadActionBar = Boolean(selectedUniversity || currentFileName || fileName);
  const hasLoadedLeads = leads.length > 0;
  const isAllProcessed = leads.length > 0 && processedDisplayCount >= leads.length;

  return (
    <div className={`space-y-6 ${showUploadActionBar ? "pt-24 pb-32" : ""}`}>
      {alert && (
        <div className="mb-6">
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        </div>
      )}

      {showUploadActionBar &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-x-0 top-0 z-[2147483647] border-b border-border bg-card px-4 py-3 shadow-2xl">
              <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {!hasLoadedLeads
                      ? selectedUniversity
                        ? currentFileName || fileName
                          ? `CSV selected: ${currentFileName || fileName}`
                          : "Select a CSV to push leads"
                        : "Loading upload controls..."
                      : isProcessing
                        ? `Pushing leads: ${processedDisplayCount} / ${leads.length}`
                        : isAllProcessed
                          ? `All visible leads processed: ${processedDisplayCount} / ${leads.length}`
                          : `Ready to push ${leads.length} lead(s)`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hasValidationErrors
                      ? "Fix validation errors before pushing."
                      : hasLoadedLeads
                        ? "Action buttons stay visible here while you review the preview."
                        : selectedUniversity
                          ? "Upload or re-select the CSV file to load leads and enable pushing."
                          : "Please wait while the university setup loads."}
                  </p>
                </div>

                {!hasLoadedLeads ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!selectedUniversity}
                    className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    <Upload className="h-5 w-5" />
                    Upload CSV
                  </button>
                ) : !isProcessing ? (
                  <button
                    onClick={processLeads}
                    disabled={hasValidationErrors || leads.length === 0 || isAllProcessed}
                    className="btn-success flex min-h-12 w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    <Rocket className="h-5 w-5" />
                    Continue & Push Leads
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                    {isPaused ? (
                      <button onClick={resumeProcessing} className="btn-success flex min-h-12 items-center justify-center gap-2">
                        <Play className="h-5 w-5" />
                        Resume
                      </button>
                    ) : (
                      <button onClick={pauseProcessing} className="btn-primary flex min-h-12 items-center justify-center gap-2">
                        <Pause className="h-5 w-5" />
                        Pause
                      </button>
                    )}
                    <button
                      onClick={stopProcessing}
                      className="flex min-h-12 items-center justify-center rounded-lg bg-destructive px-5 font-medium text-destructive-foreground"
                    >
                      Stop
                    </button>
                  </div>
                )}
              </div>
            </div>

            {hasLoadedLeads && (
              <div className="fixed inset-x-0 bottom-0 z-[2147483647] border-t border-border bg-card px-4 py-3 shadow-2xl">
                <div className="mx-auto flex max-w-6xl justify-end">
                  {!isProcessing ? (
                    <button
                      onClick={processLeads}
                      disabled={hasValidationErrors || leads.length === 0 || isAllProcessed}
                      className="btn-success flex min-h-12 w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      <Rocket className="h-5 w-5" />
                      Continue & Push Leads
                    </button>
                  ) : (
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
                      {isPaused ? (
                        <button onClick={resumeProcessing} className="btn-success flex min-h-12 items-center justify-center gap-2">
                          <Play className="h-5 w-5" />
                          Resume
                        </button>
                      ) : (
                        <button onClick={pauseProcessing} className="btn-primary flex min-h-12 items-center justify-center gap-2">
                          <Pause className="h-5 w-5" />
                          Pause
                        </button>
                      )}
                      <button
                        onClick={stopProcessing}
                        className="flex min-h-12 items-center justify-center rounded-lg bg-destructive px-5 font-medium text-destructive-foreground"
                      >
                        Stop
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>,
          document.body,
        )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Upload Leads</h2>
          <p className="text-muted-foreground">Select a university and upload student leads via CSV</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedUniversity?.sample_csv_content && (
            <button
              onClick={() => {
                const blob = new Blob([selectedUniversity.sample_csv_content!], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${selectedUniversity.name}_sample.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 text-success hover:underline font-medium"
            >
              <Download className="h-5 w-5" />
              {selectedUniversity.name} Sample
            </button>
          )}
          <button onClick={downloadSampleCSV} className="flex items-center gap-2 text-primary hover:underline">
            <Download className="h-5 w-5" />
            Generic Sample
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Panel - Upload */}
        <div className="lg:col-span-2 space-y-6">
          {/* University Selection */}
          <div className="card-elevated p-6">
            <h3 className="font-medium text-foreground mb-4">Select University</h3>
            <select
              value={selectedUniversity?.id || ""}
              onChange={handleUniversityChange}
              className="input-field"
              disabled={isProcessing}
            >
              <option value="">Choose a university...</option>
              {universities.map((uni) => (
                <option key={uni.id} value={uni.id}>
                  {uni.name}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload & Single Lead Options */}
          {selectedUniversity && (
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-foreground">Upload Leads CSV</h3>
                <button
                  onClick={() => setShowSingleLeadForm(true)}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Add Single Lead
                </button>
              </div>
              <div
                className={`upload-zone ${isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-10 w-10 text-primary mb-3" />
                {fileName ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-foreground font-medium">{fileName}</span>
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                ) : (
                  <>
                    <p className="text-foreground font-medium mb-1">Drop your CSV file here or click to browse</p>
                    <p className="text-sm text-primary">
                      {(selectedUniversity.api_type || "") === "upgrad"
                        ? "Columns: firstname, lastname, email, phone.number, phone.code, course"
                        : "Columns: Name, Email, Mobile, State, City, Course, Specialization"}
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUploadEvent}
                className="hidden"
                disabled={isProcessing}
              />
            </div>
          )}

          {leads.length > 0 && (
            <div className="sticky top-4 z-20 rounded-lg border border-border bg-card/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isProcessing ? `Pushing leads: ${processedDisplayCount} / ${leads.length}` : `Ready to push ${leads.length} lead(s)`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedUniversity?.api_type || "") === "upgrad"
                      ? "upGrad payload preview below matches the nested JSON sent to the API."
                      : "Review the preview below before pushing."}
                  </p>
                </div>

                {!isProcessing ? (
                  <button
                    onClick={processLeads}
                    disabled={hasValidationErrors || leads.length === 0 || processedDisplayCount === leads.length}
                    className="btn-success flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Rocket className="h-5 w-5" />
                    Continue & Push Leads
                  </button>
                ) : (
                  <div className="flex gap-2">
                    {isPaused ? (
                      <button onClick={resumeProcessing} className="btn-success flex items-center justify-center gap-2">
                        <Play className="h-5 w-5" />
                        Resume
                      </button>
                    ) : (
                      <button onClick={pauseProcessing} className="btn-primary flex items-center justify-center gap-2">
                        <Pause className="h-5 w-5" />
                        Pause
                      </button>
                    )}
                    <button
                      onClick={stopProcessing}
                      className="rounded-lg bg-destructive px-4 py-3 font-medium text-destructive-foreground"
                    >
                      Stop
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview Table */}
          {leads.length > 0 && (
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-foreground">Lead Preview ({leads.length} records)</h3>
                  {hasValidationErrors && (
                    <p className="text-xs text-warning flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3" />
                      {validationErrors.size} lead(s) have errors - click edit to fix
                    </p>
                  )}
                  {dbDuplicates.size > 0 && (
                    <p className="text-xs text-warning flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3" />
                      {dbDuplicates.size} duplicate(s) found in database
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {failedCount > 0 && !isProcessing && (
                    <button
                      onClick={exportFailedLeads}
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <FileDown className="h-4 w-4" />
                      Export Failed
                    </button>
                  )}
                  <button
                    onClick={clearAll}
                    className="text-sm text-destructive hover:underline"
                    disabled={isProcessing}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {processedDisplayCount === 0 && (
                <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
                  <button
                    onClick={checkDbDuplicates}
                    disabled={isCheckingDuplicates}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Search className="h-4 w-4" />
                    {isCheckingDuplicates ? "Checking..." : "Check Database Duplicates"}
                  </button>
                  {dbDuplicates.size > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Duplicate action:</span>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="duplicateAction"
                          checked={duplicateAction === "skip"}
                          onChange={() => setDuplicateAction("skip")}
                          className="accent-primary"
                        />
                        <span>Skip</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="duplicateAction"
                          checked={duplicateAction === "process"}
                          onChange={() => setDuplicateAction("process")}
                          className="accent-primary"
                        />
                        <span>Process anyway</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {(selectedUniversity?.api_type || "") === "upgrad" && leadPayloads.has(0) && (
                <div className="mb-4 rounded-lg border border-border bg-background p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">upGrad Request JSON</p>
                    <p className="text-xs text-muted-foreground">First row preview</p>
                  </div>
                  <pre className="max-h-80 overflow-auto rounded-md bg-muted/40 p-3 font-mono text-xs text-foreground whitespace-pre-wrap">
                    {leadPayloads.get(0)}
                  </pre>
                </div>
              )}

              <LeadPreviewTable
                leads={leads.slice(0, pageSize)}
                showStatus={processedDisplayCount > 0}
                leadStatuses={leadStatuses}
                leadResponses={leadResponses}
                leadPayloads={leadPayloads}
                validationErrors={validationErrors}
                dbDuplicates={dbDuplicates}
                onRetry={!isProcessing ? retryLead : undefined}
                onUpdateLead={!isProcessing ? handleUpdateLead : undefined}
                isEditable={!isProcessing && processedDisplayCount === 0}
              />

              {processedDisplayCount === 0 && !isProcessing && (
                <div className="mt-4 grid gap-3 rounded-lg border border-border bg-muted/30 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <p className="text-sm font-medium text-foreground">Review the Request JSON, then push leads.</p>
                    <p className="text-xs text-muted-foreground">
                      The preview now matches the exact upGrad nested payload sent to the API.
                    </p>
                  </div>
                  <button
                    onClick={processLeads}
                    disabled={hasValidationErrors || leads.length === 0}
                    className="btn-success flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Rocket className="h-5 w-5" />
                    Continue & Push Leads
                  </button>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {Math.min(pageSize, leads.length)} of {leads.length} records
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show:</span>
                  {[10, 20, 50, 100].map((size) => (
                    <button
                      key={size}
                      onClick={() => setPageSize(size)}
                      className={`px-2 py-1 text-sm rounded ${
                        pageSize === size
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={customPageSize}
                      onChange={(e) => setCustomPageSize(e.target.value)}
                      placeholder="Custom"
                      className="w-16 px-2 py-1 text-sm border border-border rounded bg-background"
                      min="1"
                      max={leads.length}
                    />
                    <button
                      onClick={() => handlePageSizeChange("custom")}
                      disabled={!customPageSize || parseInt(customPageSize, 10) < 1}
                      className="px-2 py-1 text-sm bg-primary text-primary-foreground rounded disabled:opacity-50"
                    >
                      Go
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {selectedUniversity && (
            <UniversityInfoPanel university={selectedUniversity} onRateLimitUpdate={handleRateLimitUpdate} />
          )}

          {leads.length > 0 && (
            <div className="card-elevated p-6">
              <h3 className="font-medium text-foreground mb-4">Processing Status</h3>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-mono text-foreground">
                    {processedDisplayCount} / {leads.length}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${leads.length > 0 ? (processedDisplayCount / leads.length) * 100 : 0}%` }}
                  />
                </div>
                {isProcessing && !isPaused && getEstimatedTime() && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getEstimatedTime()}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center p-2 rounded-lg bg-success/10">
                  <p className="font-display text-xl font-bold text-success">{successCount}</p>
                  <p className="text-xs text-muted-foreground">Success</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-destructive/10">
                  <p className="font-display text-xl font-bold text-destructive">{failedCount}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted">
                  <p className="font-display text-xl font-bold text-muted-foreground">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>

              <div className="space-y-2">
                {!isProcessing ? (
                  <>
                    <button
                      onClick={processLeads}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 shadow-sm disabled:opacity-50"
                      disabled={processedDisplayCount === leads.length}
                    >
                      <Rocket className="h-5 w-5" />
                      {processedDisplayCount > 0 ? "Continue Processing" : "Process Now (Live)"}
                    </button>
                    {processedDisplayCount === 0 && (
                      <>
                        <button
                          onClick={startBackgroundProcessing}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                        >
                          <Clock className="h-5 w-5" />
                          Queue for Background Processing
                        </button>
                        <button
                          onClick={() => {
                            const now = new Date();
                            const defaultDate = now.toISOString().split("T")[0];
                            const defaultTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes() + 5).padStart(2, "0")}`;
                            setScheduleDate(defaultDate);
                            setScheduleTime(defaultTime);
                            setShowScheduleModal(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold bg-orange-500 text-white hover:bg-orange-600 shadow-sm"
                        >
                          <CalendarClock className="h-5 w-5" />
                          Schedule for Later
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex gap-2">
                    {isPaused ? (
                      <button
                        onClick={resumeProcessing}
                        className="btn-success flex-1 flex items-center justify-center gap-2"
                      >
                        <Play className="h-5 w-5" />
                        Resume
                      </button>
                    ) : (
                      <button
                        onClick={pauseProcessing}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        <Pause className="h-5 w-5" />
                        Pause
                      </button>
                    )}
                    <button
                      onClick={stopProcessing}
                      className="px-4 py-3 rounded-lg font-medium bg-destructive text-destructive-foreground"
                    >
                      Stop
                    </button>
                  </div>
                )}

                {failedCount > 0 && !isProcessing && (
                  <button
                    onClick={bulkRetryFailed}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium border border-warning text-warning hover:bg-warning/10"
                  >
                    <RotateCcw className="h-5 w-5" />
                    Retry All Failed ({failedCount})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showSingleLeadForm && selectedUniversity && (
        <SingleLeadForm
          university={selectedUniversity}
          onClose={() => setShowSingleLeadForm(false)}
          onSuccess={() => {
            setAlert({ type: "success", message: "Lead submitted successfully!" });
          }}
        />
      )}

      {/* ✅ FIXED COLUMN MAPPING DIALOG - uses localColumnMapping for instant edits */}
      {showColumnMapping && selectedUniversity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="font-display text-xl font-bold text-foreground">Map CSV Columns</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Match your CSV columns to the correct lead fields. Each field can only be used once.
              </p>
            </div>

            <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
              {csvHeaders.map((header) => {
                // ✅ Use localColumnMapping to compute used fields
                const usedByOthers = new Set<string>();
                Object.entries(localColumnMapping).forEach(([h, f]) => {
                  if (h !== header && f && f.trim() !== "") {
                    usedByOthers.add(f);
                  }
                });

                const customColOptions = (selectedUniversity.customColumns || [])
                  .filter((col) => col.columnKey)
                  .map((col) => ({
                    value: col.columnKey,
                    label: col.columnName || col.columnKey,
                  }));

                const standardOptions = [
                  ...((selectedUniversity.api_type || "") === "upgrad"
                    ? UPGRAD_EXACT_FIELDS.map((field) => ({ value: field, label: field }))
                    : []),
                  { value: "name", label: "Name" },
                  { value: "email", label: "Email" },
                  { value: "mobile", label: "Mobile" },
                  { value: "state", label: "State" },
                  { value: "city", label: "City" },
                  { value: "address", label: "Address" },
                  { value: "course", label: "Course" },
                  { value: "formId", label: "formId" },
                  { value: "specialization", label: "Specialization" },
                  { value: "leadSource", label: "Source" },
                  { value: "leadMedium", label: "Medium" },
                  { value: "campaign_name", label: "campaign_name" },
                  { value: "program", label: "program" },
                  { value: "campus", label: "campus" },
                  { value: "district", label: "district" },
                  { value: "leadCampaign", label: "Campaign" },
                  { value: "FirstName", label: "FirstName" },
                  { value: "EmailAddress", label: "EmailAddress" },
                  { value: "Phone", label: "Phone" },
                  { value: "discipline", label: "discipline" },
                  { value: "school", label: "school" },
                  { value: "program", label: "program" },
                  { value: "mx_State", label: "mx_State" },
                  { value: "mx_Course", label: "mx_Course" },
                  { value: "mx_City", label: "mx_City" },
                  { value: "mx_Date_Of_Birth", label: "mx_Date_Of_Birth" },
                  { value: "mx_City_New", label: "mx_City_New" },
                  { value: "mx_Discipline_New", label: "mx_Discipline_New" },
                  { value: "mx_Program_New", label: "mx_Program_New" },
                  { value: "field_session", label: "field_session" },
                  { value: "center", label: "center" },
                  { value: "field_program", label: "field_program" },
                  { value: "mx_Btech_Specialisation", label: "mx_Btech_Specialisation" },
                  { value: "course_id", label: "course_id" },
                  { value: "studentName", label: "studentName" },
                  { value: "fatherName", label: "fatherName" },
                  { value: "mobile_no", label: "mobile_no" },
                  { value: "cityname", label: "cityname" },
                  { value: "courseId", label: "courseId" },
                  { value: "center", label: "center" },
                  { value: "Entity4", label: "Entity4" },
                  { value: "faculty", label: "faculty" },
                  { value: "mx_Country", label: "mx_Country" },
                  { value: "mx_Present_State", label: "mx_Present_State" },
                  { value: "mx_Course_Interested_In", label: "mx_Course_Interested_In" },
                  { value: "mx_State", label: "mx_State" },
                ];

                const userCustomOptions = userCustomFields.map((f) => ({
                  value: f,
                  label: `${f} (saved)`,
                }));

                const allOptions = [...standardOptions, ...customColOptions, ...userCustomOptions];
                const currentValue = localColumnMapping[header] || "";
                const isCustomValue =
                  currentValue && !allOptions.some((o) => o.value === currentValue);

                return (
                  <div key={header} className="flex items-center gap-4">
                    <span className="w-1/3 text-sm font-medium text-foreground truncate" title={header}>
                      {header}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <select
                      value={currentValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__add_new__") {
                          const entered = window.prompt(
                            `Add custom API field name for column "${header}"\n\n(Use the exact key your API expects, e.g. mx_NewField, extraFields.foo)`,
                            "",
                          );
                          const clean = (entered || "").trim();
                          if (!clean) return;
                          addUserCustomField(clean); // persist forever for this university
                          setLocalColumnMapping((prev) => ({ ...prev, [header]: clean }));
                          return;
                        }
                        setLocalColumnMapping((prev) => ({ ...prev, [header]: val }));
                      }}
                      className="flex-1 input-field text-sm"
                    >
                      <option value="">-- Skip this column --</option>
                      {isCustomValue && (
                        <option value={currentValue}>
                          {currentValue} (custom)
                        </option>
                      )}
                      {allOptions.map((opt) => {
                        const isUsed = usedByOthers.has(opt.value);
                        return (
                          <option key={opt.value} value={opt.value} disabled={isUsed}>
                            {opt.label}
                            {isUsed ? " (already mapped)" : ""}
                          </option>
                        );
                      })}
                      <option value="__add_new__">+ Add new custom field…</option>
                    </select>
                  </div>
                );
              })}
            </div>

            <div className="p-6 border-t border-border flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  const savedMappingKey = `csv_mapping_${selectedUniversity.id}`;
                  localStorage.removeItem(savedMappingKey);
                  setAlert({ type: "info", message: "Saved column mapping cleared. It will ask again next time." });
                }}
                className="text-sm text-warning hover:underline"
              >
                Reset Saved Mapping
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowColumnMapping(false);
                    setCsvHeaders([]);
                    setTempColumnMapping({});
                    setLocalColumnMapping({});
                    setFileName("");
                    setCsvData("");
                    delete (window as any).__pendingCsvData;
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="px-6 py-3 rounded-lg font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                {/* ✅ Passes localColumnMapping directly to apply function */}
                <button onClick={() => applyColumnMappingAndProcess(localColumnMapping)} className="btn-primary">
                  Apply Mapping & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedUniversity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                Schedule Processing
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Leads will be processed automatically at the scheduled time - no need to keep the app open.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">University</label>
                <p className="text-sm text-muted-foreground">{selectedUniversity.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Total Leads</label>
                <p className="text-sm text-muted-foreground">
                  {leads.length} leads from {fileName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Rate</label>
                <p className="text-sm text-muted-foreground">{selectedUniversity.leads_per_minute || 5} leads/minute</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="input-field w-full"
                  />
                </div>
              </div>
              {leads.length > 0 && scheduleDate && scheduleTime && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <p>
                    Estimated completion: ~{Math.ceil(leads.length / (selectedUniversity.leads_per_minute || 5))}{" "}
                    minutes after start
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-6 py-3 rounded-lg font-medium text-muted-foreground hover:bg-muted"
                disabled={isScheduling}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!scheduleDate || !scheduleTime) {
                    setAlert({ type: "error", message: "Please select both date and time" });
                    return;
                  }
                  const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
                  if (scheduledAt <= new Date()) {
                    setAlert({ type: "error", message: "Scheduled time must be in the future" });
                    return;
                  }
                  scheduleProcessing(scheduledAt);
                }}
                disabled={isScheduling || !scheduleDate || !scheduleTime}
                className="btn-primary flex items-center gap-2"
              >
                {isScheduling ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <CalendarClock className="h-4 w-4" />
                    Schedule {leads.length} Leads
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
