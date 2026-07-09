/**
 * useUploadStatePersistence - Unified state persistence for lead upload
 *
 * This replaces the dual localStorage/sessionStorage systems with a single,
 * robust implementation that:
 * 1. Uses localStorage for cross-tab persistence
 * 2. Saves immediately on visibility change (tab switch)
 * 3. Saves on beforeunload (browser close)
 * 4. Hydrates state synchronously on mount
 * 5. Tracks processing state in URL slug
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { Lead } from "@/utils/leadValidation";

// ============= Storage Keys =============
const STORAGE_KEY = "dekhocampus_upload_v3";
const PROCESSING_STATE_KEY = "dekhocampus_upload_processing_v1";

// ============= Types =============
export interface ProcessingState {
  isProcessing: boolean;
  isPaused: boolean;
  currentIndex: number;
  batchId: string | null;
  startTime: number | null;
}

export interface UploadState {
  // University selection
  selectedUniversityId: string | null;

  // File data
  fileName: string;
  csvData: string;
  csvHeaders: string[];

  // Parsed leads
  leads: Lead[];

  // Column mapping
  tempColumnMapping: Record<string, string>;

  // Validation state
  validationErrors: Record<number, string[]>;
  hasValidationErrors: boolean;
  dbDuplicates: number[];
  duplicateAction: "skip" | "process";

  // Processing state
  processedCount: number;
  leadStatuses: Record<number, "pending" | "success" | "failed" | "duplicate">;
  leadResponses: Record<number, string>;
  leadPayloads: Record<number, string>;
  leadDbIds: Record<number, string>;
  batchId: string | null;

  // UI state
  showSingleLeadForm: boolean;
  pageSize: number;
  searchTerm: string;
  currentPage: number;
}

const DEFAULT_STATE: UploadState = {
  selectedUniversityId: null,
  fileName: "",
  csvData: "",
  csvHeaders: [],
  leads: [],
  tempColumnMapping: {},
  validationErrors: {},
  hasValidationErrors: false,
  dbDuplicates: [],
  duplicateAction: "skip",
  processedCount: 0,
  leadStatuses: {},
  leadResponses: {},
  leadPayloads: {},
  leadDbIds: {},
  batchId: null,
  showSingleLeadForm: false,
  pageSize: 10,
  searchTerm: "",
  currentPage: 0,
};

const DEFAULT_PROCESSING_STATE: ProcessingState = {
  isProcessing: false,
  isPaused: false,
  currentIndex: 0,
  batchId: null,
  startTime: null,
};

// ============= Storage Helpers =============
function coerceLeadValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "";

  if (Array.isArray(value)) {
    return value.map(coerceLeadValue).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 1) {
      return coerceLeadValue(entries[0][1]);
    }

    const preferredKey = ["name", "contact_name", "value", "label"].find(
      (key) => key in (value as Record<string, unknown>),
    );
    if (preferredKey) {
      return coerceLeadValue((value as Record<string, unknown>)[preferredKey]);
    }

    return entries
      .map(([, nestedValue]) => coerceLeadValue(nestedValue))
      .filter(Boolean)
      .join(", ");
  }

  return "";
}

function normalizeLead(lead: Lead): Lead {
  return Object.fromEntries(Object.entries(lead).map(([key, value]) => [key, coerceLeadValue(value)])) as Lead;
}

function normalizeLeads(leads: Lead[]): Lead[] {
  return leads.map(normalizeLead);
}

function loadFromStorage(): { state: UploadState; processing: ProcessingState } {
  try {
    const stateStr = localStorage.getItem(STORAGE_KEY);
    const processingStr = localStorage.getItem(PROCESSING_STATE_KEY);

    const state = stateStr ? JSON.parse(stateStr) : DEFAULT_STATE;
    const processing = processingStr ? JSON.parse(processingStr) : DEFAULT_PROCESSING_STATE;

    // Validate and merge with defaults to handle missing fields
    return {
      state: {
        ...DEFAULT_STATE,
        ...state,
        leads: normalizeLeads(Array.isArray(state?.leads) ? state.leads : []),
      },
      processing: { ...DEFAULT_PROCESSING_STATE, ...processing },
    };
  } catch (error) {
    console.error("[UploadStatePersistence] Failed to load from storage:", error);
    return { state: DEFAULT_STATE, processing: DEFAULT_PROCESSING_STATE };
  }
}

function saveToStorage(state: UploadState, processing: ProcessingState): void {
  try {
    const normalizedState = {
      ...state,
      leads: normalizeLeads(state.leads),
    };

    const stateToPersist: UploadState = processing.isProcessing
      ? {
          ...normalizedState,
          // Keep leadStatuses and leadResponses so polling data persists across saves
          // Only skip heavy payloads to reduce storage size
          leadPayloads: {},
          csvData: normalizedState.csvData.length > 500000 ? "" : normalizedState.csvData,
        }
      : normalizedState;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist));
    localStorage.setItem(PROCESSING_STATE_KEY, JSON.stringify(processing));
  } catch (error) {
    console.error("[UploadStatePersistence] Failed to save:", error);
  }
}

function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROCESSING_STATE_KEY);
    // Storage cleared
  } catch (error) {
    console.error("[UploadStatePersistence] Failed to clear:", error);
  }
}

// ============= URL Slug Helpers =============
type ProcessingSlug = "processing" | "paused" | "complete" | "idle";

function getProcessingSlug(processing: ProcessingState, state: UploadState): ProcessingSlug {
  if (processing.isProcessing && processing.isPaused) return "paused";
  if (processing.isProcessing) return "processing";

  const totalProcessed = Object.values(state.leadStatuses).filter((status) => status !== "pending").length;
  if (totalProcessed > 0 && totalProcessed === state.leads.length) return "complete";

  return "idle";
}

// ============= Main Hook =============
interface UseUploadStatePersistenceOptions {
  onNavigateWithState?: (path: string) => void;
}

interface UseUploadStatePersistenceReturn {
  // State
  state: UploadState;
  processing: ProcessingState;

  // State updates
  setState: (updates: Partial<UploadState>) => void;
  setProcessing: (updates: Partial<ProcessingState>) => void;

  // Convenience setters
  setLeads: (leads: Lead[]) => void;
  setLeadStatus: (index: number, status: "pending" | "success" | "failed") => void;
  setLeadResponse: (index: number, response: string) => void;
  setLeadPayload: (index: number, payload: string) => void;
  setValidationError: (index: number, errors: string[] | null) => void;
  incrementProcessedCount: () => void;

  // Actions
  resetAll: () => void;
  forceSave: () => void;

  // Computed values
  processingSlug: ProcessingSlug;
  isHydrated: boolean;

  // Map/Set conversions for components
  validationErrorsMap: Map<number, string[]>;
  dbDuplicatesSet: Set<number>;
  leadStatusesMap: Map<number, "pending" | "success" | "failed" | "duplicate">;
  leadResponsesMap: Map<number, string>;
  leadPayloadsMap: Map<number, string>;
  leadDbIdsMap: Map<number, string>;
}

export function useUploadStatePersistence(
  _options: UseUploadStatePersistenceOptions = {},
): UseUploadStatePersistenceReturn {
  // Synchronous hydration from localStorage
  const initialData = useMemo(() => loadFromStorage(), []);

  const [state, setStateInternal] = useState<UploadState>(initialData.state);
  const [processing, setProcessingInternal] = useState<ProcessingState>(initialData.processing);
  const [isHydrated, setIsHydrated] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  const processingRef = useRef(processing);

  // Keep refs in sync
  useEffect(() => {
    stateRef.current = state;
    processingRef.current = processing;
  }, [state, processing]);

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Debounced save
  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const delay = processingRef.current.isProcessing ? 2000 : 300;
    saveTimeoutRef.current = setTimeout(() => {
      saveToStorage(stateRef.current, processingRef.current);
    }, delay);
  }, []);

  // Immediate save (for visibility change / unload)
  const forceSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    saveToStorage(stateRef.current, processingRef.current);
  }, []);

  // State update with auto-save
  const setState = useCallback(
    (updates: Partial<UploadState>) => {
      setStateInternal((prev) => {
        const next = { ...prev, ...updates };
        stateRef.current = next;
        scheduleSave();
        return next;
      });
    },
    [scheduleSave],
  );

  // Processing state update with auto-save
  const setProcessing = useCallback(
    (updates: Partial<ProcessingState>) => {
      setProcessingInternal((prev) => {
        const next = { ...prev, ...updates };
        processingRef.current = next;
        scheduleSave();
        return next;
      });
    },
    [scheduleSave],
  );

  // Convenience setters
  const setLeads = useCallback(
    (leads: Lead[]) => {
      setState({ leads: normalizeLeads(leads) });
    },
    [setState],
  );

  const setLeadStatus = useCallback(
    (index: number, status: "pending" | "success" | "failed") => {
      setStateInternal((prev) => {
        const next = {
          ...prev,
          leadStatuses: { ...prev.leadStatuses, [index]: status },
        };
        stateRef.current = next;
        scheduleSave();
        return next;
      });
    },
    [scheduleSave],
  );

  const setLeadResponse = useCallback(
    (index: number, response: string) => {
      setStateInternal((prev) => {
        const next = {
          ...prev,
          leadResponses: { ...prev.leadResponses, [index]: response },
        };
        stateRef.current = next;
        scheduleSave();
        return next;
      });
    },
    [scheduleSave],
  );

  const setLeadPayload = useCallback(
    (index: number, payload: string) => {
      setStateInternal((prev) => {
        const next = {
          ...prev,
          leadPayloads: { ...prev.leadPayloads, [index]: payload },
        };
        stateRef.current = next;
        scheduleSave();
        return next;
      });
    },
    [scheduleSave],
  );

  const setValidationError = useCallback(
    (index: number, errors: string[] | null) => {
      setStateInternal((prev) => {
        const newErrors = { ...prev.validationErrors };
        if (errors === null) {
          delete newErrors[index];
        } else {
          newErrors[index] = errors;
        }
        const next = {
          ...prev,
          validationErrors: newErrors,
          hasValidationErrors: Object.keys(newErrors).length > 0,
        };
        stateRef.current = next;
        scheduleSave();
        return next;
      });
    },
    [scheduleSave],
  );

  const incrementProcessedCount = useCallback(() => {
    setStateInternal((prev) => {
      const next = { ...prev, processedCount: prev.processedCount + 1 };
      stateRef.current = next;
      scheduleSave();
      return next;
    });
  }, [scheduleSave]);

  // Reset all state
  const resetAll = useCallback(() => {
    setStateInternal(DEFAULT_STATE);
    setProcessingInternal(DEFAULT_PROCESSING_STATE);
    stateRef.current = DEFAULT_STATE;
    processingRef.current = DEFAULT_PROCESSING_STATE;
    clearStorage();
  }, []);

  // Computed processing slug
  const processingSlug = useMemo(() => getProcessingSlug(processing, state), [processing, state]);

  // Map/Set conversions
  const validationErrorsMap = useMemo(
    () => new Map(Object.entries(state.validationErrors).map(([k, v]) => [parseInt(k), v])),
    [state.validationErrors],
  );

  const dbDuplicatesSet = useMemo(() => new Set(state.dbDuplicates), [state.dbDuplicates]);

  const leadStatusesMap = useMemo(
    () => new Map(Object.entries(state.leadStatuses).map(([k, v]) => [parseInt(k), v])),
    [state.leadStatuses],
  );

  const leadResponsesMap = useMemo(
    () => new Map(Object.entries(state.leadResponses).map(([k, v]) => [parseInt(k), v])),
    [state.leadResponses],
  );

  const leadPayloadsMap = useMemo(
    () => new Map(Object.entries(state.leadPayloads).map(([k, v]) => [parseInt(k), v])),
    [state.leadPayloads],
  );

  const leadDbIdsMap = useMemo(
    () => new Map(Object.entries(state.leadDbIds).map(([k, v]) => [parseInt(k), v])),
    [state.leadDbIds],
  );

  // Save immediately on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        forceSave();
      }
    };

    const handleBeforeUnload = () => {
      forceSave();
    };

    // Also handle page hide for mobile browsers
    const handlePageHide = () => {
      forceSave();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [forceSave]);

  // Persist via state setters (debounced); this avoids duplicate scheduling on every render

  return {
    state,
    processing,
    setState,
    setProcessing,
    setLeads,
    setLeadStatus,
    setLeadResponse,
    setLeadPayload,
    setValidationError,
    incrementProcessedCount,
    resetAll,
    forceSave,
    processingSlug,
    isHydrated,
    validationErrorsMap,
    dbDuplicatesSet,
    leadStatusesMap,
    leadResponsesMap,
    leadPayloadsMap,
    leadDbIdsMap,
  };
}

// ============= Helper to check if there's saved data =============
export function hasSavedUploadData(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    const data: UploadState = JSON.parse(stored);
    return data.leads.length > 0 || data.fileName !== "";
  } catch {
    return false;
  }
}
