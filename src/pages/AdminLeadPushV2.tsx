import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LeadPushModule } from "@/components/leadpush/LeadPushModule";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/AdminLayout";
import { AddUniversityModal, type UniversityFormData } from "@/components/universities/AddUniversityModal";
import { EditUniversityModal, type UniversityEditData } from "@/components/universities/EditUniversityModal";

function rowToEditData(u: any): UniversityEditData {
  return {
    id: u.id,
    name: u.name || "",
    apiUrl: u.api_url || "",
    collegeId: u.college_id || "",
    secretKey: u.secret_key || "",
    source: u.source || "dekhocampus",
    medium: u.medium || "dekhocampus",
    campaign: u.campaign || "API",
    leadsPerMinute: u.leads_per_minute || 5,
    apiType: u.api_type || "nopaperforms",
    utmLink: u.utm_link || "",
    publisherPanelUrl: u.publisher_panel_url || "",
    publisherId: u.publisher_id || "",
    authType: u.auth_type || "secret_key",
    authHeaderKey: u.auth_header_key || "Authorization",
    authHeaderValue: u.auth_header_value || "",
    payloadWrapper: u.payload_wrapper || "object",
    customHeaders: u.custom_headers || {},
    programs: u.programs || [],
    stateCities: u.state_cities || [],
    courseSpecializations: u.course_specializations || [],
    columnMapping: u.column_mapping || {},
    payloadFields: u.payload_fields || undefined,
    sampleCsvContent: u.sample_csv_content || "",
  };
}

function formToRow(f: UniversityFormData | UniversityEditData): Record<string, any> {
  return {
    name: f.name ?? "",
    api_url: f.apiUrl ?? "",
    college_id: f.collegeId ?? "",
    secret_key: f.secretKey ?? "",
    source: f.source ?? "dekhocampus",
    medium: f.medium ?? "dekhocampus",
    campaign: f.campaign ?? "API",
    leads_per_minute: f.leadsPerMinute ?? 5,
    api_type: f.apiType ?? "nopaperforms",
    utm_link: f.utmLink || null,
    column_mapping: f.columnMapping || {},
    default_values: (f as UniversityFormData).defaultValues || {},
  };
}

export default function AdminLeadPushV2() {
  const { toast } = useToast();
  const [universities, setUniversities] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedUploadUniversity, setSelectedUploadUniversity] = useState<any | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UniversityEditData | null>(null);

  const refresh = useCallback(async () => {
    const [u, b, l] = await Promise.all([
      (supabase as any).from("universities").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("upload_batches").select("*").order("created_at", { ascending: false }).limit(200),
      (supabase as any).from("api_logs").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setUniversities(u.data || []);
    setBatches(b.data || []);
    setLogs(l.data || []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this university?")) return;
    const { error } = await (supabase as any).from("universities").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); refresh(); }
  };

  const handleAddSave = async (f: UniversityFormData) => {
    const { error } = await (supabase as any).from("universities").insert(formToRow(f));
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      throw error;
    }
    toast({ title: "University added" });
    await refresh();
  };

  const handleEditSave = async (f: UniversityEditData) => {
    const { error } = await (supabase as any).from("universities").update(formToRow(f)).eq("id", f.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "University updated" });
    setEditTarget(null);
    await refresh();
  };

  const handleBulkImport = async (configs: any[]) => {
    if (!configs?.length) return;
    const rows = configs.map((c) => ({
      name: c.name ?? "",
      api_url: c.apiUrl ?? "",
      college_id: c.collegeId ?? "",
      secret_key: c.secretKey ?? "",
      source: c.source ?? "dekhocampus",
      medium: c.medium ?? "dekhocampus",
      campaign: c.campaign ?? "API",
      leads_per_minute: c.leadsPerMinute ?? 5,
      api_type: c.apiType ?? "nopaperforms",
      utm_link: c.utmLink || null,
      column_mapping: c.columnMapping || {},
      default_values: c.defaultValues || {},
    }));

    const BATCH = 200;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const { error } = await (supabase as any).from("universities").insert(slice);
      if (error) {
        toast({ title: "Bulk import failed", description: error.message, variant: "destructive" });
        await refresh();
        return;
      }
      inserted += slice.length;
    }
    toast({ title: "Imported", description: `${inserted} university config(s) added` });
    await refresh();
  };

  return (
    <AdminLayout title="Lead Push">
      <LeadPushModule
        universities={universities}
        logs={logs}
        batches={batches}
        onUniversitiesChange={refresh}
        onAddUniversity={() => setAddOpen(true)}
        onEditUniversity={(uni) => setEditTarget(rowToEditData(uni))}
        onDeleteUniversity={handleDelete}
        onSelectUploadUniversity={setSelectedUploadUniversity}
        selectedUploadUniversity={selectedUploadUniversity}
        onBulkImport={handleBulkImport}
      />
      <AddUniversityModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAddSave}
        existingUniversities={universities.map((u) => u.name)}
      />
      <EditUniversityModal
        isOpen={!!editTarget}
        university={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleEditSave}
      />
    </AdminLayout>
  );
}
