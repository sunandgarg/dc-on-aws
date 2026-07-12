import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import UniversityFormDialog from "@/components/leadpush/UniversityFormDialog";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { functionUrl } from "@/lib/backendMode";
import { Plus, Trash2, Pencil, Play, RefreshCw, Building2, Filter, Network, GitBranch, ListChecks, Upload, KeyRound, Link2, Send, Copy } from "lucide-react";

const empty = "";
const toCsv = (a: string[] | null | undefined) => (a || []).join(", ");
const fromCsv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

/* ───────── Universities ───────── */
function UniversitiesTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["lp_universities"], queryFn: async () => (await supabase.from("lp_universities" as any).select("*").order("created_at", { ascending: false })).data || [] });
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const remove = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("lp_universities" as any).delete().eq("id", id); qc.invalidateQueries({ queryKey: ["lp_universities"] }); };
  const test = async (id: string) => {
    toast.info("Sending test lead...");
    const { data, error } = await supabase.functions.invoke("lp-test-api", { body: { university_id: id } });
    if (error) toast.error(error.message); else toast.success(`Test: ${data?.status} (${data?.httpStatus})`);
  };
  const rows: any[] = (data as any) || [];
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Partner colleges / lead destinations.</p>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white"><Plus className="w-4 h-4 mr-1" />Add University</Button>
      </div>
      <div className="grid gap-3">
        {rows.map((u: any) => (
          <div key={u.id} className="border border-border rounded-xl p-4 bg-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{u.name}</span>
                  <Badge variant={u.is_active ? "default" : "secondary"} className="text-[10px]">{u.is_active ? "Active" : "Off"}</Badge>
                  <Badge variant="outline" className="text-[10px]">{u.api_type}</Badge>
                  <Badge variant="outline" className="text-[10px]">{u.leads_per_minute}/min</Badge>
                  {Array.isArray(u.programs) && u.programs.length > 0 && <Badge variant="outline" className="text-[10px]">{u.programs.length} programs</Badge>}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-1">{u.api_url}</div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => test(u.id)}><Send className="w-3.5 h-3.5 mr-1" />Test</Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(u); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(u.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-muted-foreground py-8 text-center">No universities yet.</p>}
      </div>
      <UniversityFormDialog
        open={open}
        initial={editing}
        existingNames={rows.map((r) => r.name)}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSaved={() => qc.invalidateQueries({ queryKey: ["lp_universities"] })}
      />
    </div>
  );
}

/* ───────── Rules ───────── */
function RulesTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["lp_rules"], queryFn: async () => (await supabase.from("lp_automation_rules" as any).select("*").order("priority")).data || [] });
  const { data: unis } = useQuery({ queryKey: ["lp_universities_pick"], queryFn: async () => (await supabase.from("lp_universities" as any).select("id,name").order("name")).data || [] });
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const blank: any = { name: "", description: "", priority: 100, is_active: true, match_cities: [], match_states: [], match_courses: [], match_sources: [], match_ctas: [], match_all: false, university_ids: [] };
  const save = async () => {
    const row = { ...editing };
    const { error } = row.id ? await supabase.from("lp_automation_rules" as any).update(row).eq("id", row.id) : await supabase.from("lp_automation_rules" as any).insert(row);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["lp_rules"] });
  };
  const remove = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("lp_automation_rules" as any).delete().eq("id", id); qc.invalidateQueries({ queryKey: ["lp_rules"] }); };
  const toggleUni = (id: string) => {
    const ids = editing.university_ids || [];
    setEditing({ ...editing, university_ids: ids.includes(id) ? ids.filter((x: string) => x !== id) : [...ids, id] });
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-between"><p className="text-sm text-muted-foreground">"If lead matches X → push to colleges A/B/C". Empty conditions = wildcards.</p><Button size="sm" onClick={() => { setEditing(blank); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />Add Rule</Button></div>
      <div className="grid gap-3">
        {(data || []).map((r: any) => (
          <div key={r.id} className="border border-border rounded-xl p-4 bg-card flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{r.name}</span>
                <Badge variant={r.is_active ? "default" : "secondary"} className="text-[10px]">{r.is_active ? "Active" : "Off"}</Badge>
                <Badge variant="outline" className="text-[10px]">priority {r.priority}</Badge>
                <Badge variant="outline" className="text-[10px]">{r.match_all ? "ALL" : "ANY"} match</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-2 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0.5">
                {r.match_cities?.length ? <div><b>City:</b> {r.match_cities.join(", ")}</div> : null}
                {r.match_states?.length ? <div><b>State:</b> {r.match_states.join(", ")}</div> : null}
                {r.match_courses?.length ? <div><b>Course:</b> {r.match_courses.join(", ")}</div> : null}
                {r.match_sources?.length ? <div><b>Source:</b> {r.match_sources.join(", ")}</div> : null}
                {r.match_ctas?.length ? <div><b>CTA:</b> {r.match_ctas.join(", ")}</div> : null}
                <div className="col-span-full"><b>→ {r.university_ids?.length || 0} university(ies)</b></div>
              </div>
            </div>
            <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></div>
          </div>
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground py-8 text-center">No rules yet.</p>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} Rule</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="md:col-span-2"><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div><Label>Priority</Label><Input type="number" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: parseInt(e.target.value) || 100 })} /></div>
              </div>
              <div><Label>Description</Label><Input value={editing.description || empty} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Match Cities</Label><Input value={toCsv(editing.match_cities)} onChange={(e) => setEditing({ ...editing, match_cities: fromCsv(e.target.value) })} placeholder="Delhi, Mumbai" /></div>
                <div><Label>Match States</Label><Input value={toCsv(editing.match_states)} onChange={(e) => setEditing({ ...editing, match_states: fromCsv(e.target.value) })} /></div>
                <div><Label>Match Courses</Label><Input value={toCsv(editing.match_courses)} onChange={(e) => setEditing({ ...editing, match_courses: fromCsv(e.target.value) })} placeholder="mba, btech" /></div>
                <div><Label>Match Sources</Label><Input value={toCsv(editing.match_sources)} onChange={(e) => setEditing({ ...editing, match_sources: fromCsv(e.target.value) })} /></div>
                <div className="md:col-span-2"><Label>Match CTAs</Label><Input value={toCsv(editing.match_ctas)} onChange={(e) => setEditing({ ...editing, match_ctas: fromCsv(e.target.value) })} /></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><Switch checked={editing.match_all} onCheckedChange={(v) => setEditing({ ...editing, match_all: v })} /><Label>Require ALL</Label></div>
                <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
              </div>
              <div>
                <Label>Push to Universities</Label>
                <div className="grid md:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto border border-border rounded-lg p-2 mt-1">
                  {(unis || []).map((u: any) => <label key={u.id} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted cursor-pointer"><input type="checkbox" checked={(editing.university_ids || []).includes(u.id)} onChange={() => toggleUni(u.id)} />{u.name}</label>)}
                  {!unis?.length && <p className="text-xs text-muted-foreground p-2">Add universities first.</p>}
                </div>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───────── Flows / MultiFlows (generic) ───────── */
function FlowsTab({ table, label, picksFrom, picksLabel, extraFields }: { table: string; label: string; picksFrom: string; picksLabel: string; extraFields?: (e: any, set: (e: any) => void) => React.ReactNode }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: [table], queryFn: async () => (await supabase.from(table as any).select("*").order("created_at", { ascending: false })).data || [] });
  const { data: picks } = useQuery({ queryKey: [picksFrom, "pick"], queryFn: async () => (await supabase.from(picksFrom as any).select("id,name").order("name")).data || [] });
  const [editing, setEditing] = useState<any>(null); const [open, setOpen] = useState(false);
  const fieldName = table === "lp_marketing_flows" ? "rule_ids" : "flow_ids";
  const blank: any = table === "lp_marketing_flows" ? { name: "", description: "", rule_ids: [], is_active: true } : { name: "", description: "", flow_ids: [], trigger_event: "lead_insert", is_active: true };
  const save = async () => {
    const row = { ...editing };
    const { error } = row.id ? await supabase.from(table as any).update(row).eq("id", row.id) : await supabase.from(table as any).insert(row);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: [table] });
  };
  const remove = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from(table as any).delete().eq("id", id); qc.invalidateQueries({ queryKey: [table] }); };
  const toggle = (id: string) => { const arr = editing[fieldName] || []; setEditing({ ...editing, [fieldName]: arr.includes(id) ? arr.filter((x: string) => x !== id) : [...arr, id] }); };
  return (
    <div className="space-y-4">
      <div className="flex justify-between"><p className="text-sm text-muted-foreground">{label}</p><Button size="sm" onClick={() => { setEditing(blank); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />Add</Button></div>
      <div className="grid gap-3">
        {(data || []).map((r: any) => (
          <div key={r.id} className="border border-border rounded-xl p-4 bg-card flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{r.name}</span>
                <Badge variant={r.is_active ? "default" : "secondary"} className="text-[10px]">{r.is_active ? "Active" : "Off"}</Badge>
                {r.trigger_event && <Badge variant="outline" className="text-[10px]">{r.trigger_event}</Badge>}
                <Badge variant="outline" className="text-[10px]">{(r[fieldName] || []).length} {picksLabel}</Badge>
              </div>
              {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
            </div>
            <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></div>
          </div>
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground py-8 text-center">None yet.</p>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea rows={2} value={editing.description || empty} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              {extraFields?.(editing, setEditing)}
              <div>
                <Label>Include {picksLabel}</Label>
                <div className="grid md:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto border border-border rounded-lg p-2 mt-1">
                  {(picks || []).map((u: any) => <label key={u.id} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted cursor-pointer"><input type="checkbox" checked={(editing[fieldName] || []).includes(u.id)} onChange={() => toggle(u.id)} />{u.name}</label>)}
                  {!picks?.length && <p className="text-xs text-muted-foreground p-2">Create {picksLabel} first.</p>}
                </div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            </div>
          )}
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───────── Logs ───────── */
function LogsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["lp_logs"],
    queryFn: async () => {
      const { data: logs } = await supabase.from("lp_push_logs" as any).select("*").order("created_at", { ascending: false }).limit(200);
      const { data: unis } = await supabase.from("lp_universities" as any).select("id,name");
      const m = new Map((unis || []).map((u: any) => [u.id, u.name]));
      return (logs || []).map((l: any) => ({ ...l, university_name: m.get(l.university_id) || "-" }));
    },
  });
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center"><p className="text-sm text-muted-foreground">Last 200 push attempts.</p><Button size="sm" variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["lp_logs"] })}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button></div>
      <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-2">When</th><th className="text-left p-2">University</th><th className="text-left p-2">Status</th><th className="text-left p-2">HTTP</th><th className="text-left p-2">Response</th></tr></thead>
          <tbody>
            {(data || []).map((l: any) => (
              <tr key={l.id} className="border-t border-border">
                <td className="p-2 text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                <td className="p-2">{l.university_name}</td>
                <td className="p-2"><Badge variant={l.status === "Success" ? "default" : l.status === "Duplicate" ? "secondary" : "destructive"} className="text-[10px]">{l.status}</Badge></td>
                <td className="p-2">{l.http_status || "-"}</td>
                <td className="p-2 text-xs text-muted-foreground truncate max-w-md" title={l.response_body || l.error}>{l.response_body || l.error}</td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No attempts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────── Test / Manual Dispatch ───────── */
function TestTab() {
  const [leadId, setLeadId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const run = async (dry_run: boolean) => {
    if (!leadId) return toast.error("Enter a lead ID");
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("lp-dispatch-lead", { body: { lead_id: leadId, dry_run } });
      if (error) throw error;
      setResult(data); toast.success(dry_run ? "Dry run complete" : "Dispatched");
    } catch (e: any) { toast.error(e.message); } finally { setRunning(false); }
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Replay a lead through the active automation pipeline.</p>
      <div className="flex gap-2"><Input placeholder="Lead UUID" value={leadId} onChange={(e) => setLeadId(e.target.value)} /><Button variant="outline" onClick={() => run(true)} disabled={running}>Dry Run</Button><Button onClick={() => run(false)} disabled={running}><Play className="w-4 h-4 mr-1" />Dispatch</Button></div>
      {result && <pre className="bg-muted p-3 rounded-xl text-xs overflow-auto max-h-96">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

/* ───────── Bulk Upload ───────── */
function BulkUploadTab() {
  const qc = useQueryClient();
  const { data: unis } = useQuery({ queryKey: ["lp_universities_bulk"], queryFn: async () => (await supabase.from("lp_universities" as any).select("id,name").eq("is_active", true).order("name")).data || [] });
  const { data: batches } = useQuery({ queryKey: ["lp_batches"], queryFn: async () => (await supabase.from("lp_batches" as any).select("*").order("created_at", { ascending: false }).limit(50)).data || [], refetchInterval: 3000 });
  const [csv, setCsv] = useState("");
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const parseCsv = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cells = line.split(",").map((c) => c.trim());
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = cells[i] || ""; });
      return obj;
    });
  };
  const rows = useMemo(() => parseCsv(csv), [csv]);

  const onFile = async (file: File) => {
    const text = await file.text();
    setCsv(text);
    if (!name) setName(file.name);
  };
  const submit = async () => {
    if (!rows.length) return toast.error("No rows");
    if (!picked.length) return toast.error("Pick at least one university");
    setSubmitting(true);
    try {
      const { data: batch, error } = await (supabase.from("lp_batches" as any).insert({ name: name || "Upload", source: "upload" }).select("id").single() as any);
      if (error) throw error;
      const { error: fnErr } = await supabase.functions.invoke("lp-process-batch", { body: { batch_id: batch.id, university_ids: picked, rows } });
      if (fnErr) throw fnErr;
      toast.success(`Queued ${rows.length * picked.length} pushes`);
      setCsv(""); setName(""); setPicked([]);
      qc.invalidateQueries({ queryKey: ["lp_batches"] });
    } catch (e: any) { toast.error(e.message); } finally { setSubmitting(false); }
  };
  const togglePick = (id: string) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  return (
    <div className="space-y-5">
      <div className="border border-border rounded-xl p-4 bg-card space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><Upload className="w-4 h-4" />New Bulk Push</h3>
        <p className="text-xs text-muted-foreground">CSV first row = headers. Common columns: <code>name, email, phone, city, state, course, source</code>.</p>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Batch Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="MBA Delhi - Dec wave" /></div>
          <div><Label>CSV file</Label><Input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} /></div>
        </div>
        <div><Label>Or paste CSV</Label><Textarea rows={5} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="name,email,phone,city,state,course&#10;John,john@x.com,9999999999,Delhi,Delhi,mba" /></div>
        {rows.length > 0 && <p className="text-xs text-muted-foreground">Parsed {rows.length} rows.</p>}
        <div>
          <Label>Push to Universities</Label>
          <div className="grid md:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto border border-border rounded-lg p-2 mt-1">
            {(unis || []).map((u: any) => <label key={u.id} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted cursor-pointer"><input type="checkbox" checked={picked.includes(u.id)} onChange={() => togglePick(u.id)} />{u.name}</label>)}
          </div>
        </div>
        <Button onClick={submit} disabled={submitting || !rows.length || !picked.length}><Play className="w-4 h-4 mr-1" />{submitting ? "Queuing..." : `Start Push (${rows.length * picked.length} attempts)`}</Button>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Recent Batches</h3>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-2">Name</th><th className="text-left p-2">Status</th><th className="text-left p-2">Total</th><th className="text-left p-2">Success</th><th className="text-left p-2">Duplicate</th><th className="text-left p-2">Fail</th><th className="text-left p-2">When</th></tr></thead>
            <tbody>
              {(batches || []).map((b: any) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="p-2">{b.name}</td>
                  <td className="p-2"><Badge variant={b.status === "completed" ? "default" : b.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">{b.status}</Badge></td>
                  <td className="p-2">{b.total}</td><td className="p-2 text-emerald-600">{b.success}</td>
                  <td className="p-2 text-amber-600">{b.duplicate}</td><td className="p-2 text-destructive">{b.fail}</td>
                  <td className="p-2 text-xs">{new Date(b.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!batches?.length && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No batches yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ───────── Webhook API Keys ───────── */
function ApiKeysTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["lp_api_keys"], queryFn: async () => (await supabase.from("lp_api_keys" as any).select("*").order("created_at", { ascending: false })).data || [] });
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const blank: any = { name: "", api_key: crypto.randomUUID().replace(/-/g, ""), is_active: true, rate_limit_per_minute: 60, allowed_ips: [], default_source: "", notes: "" };
  const save = async () => {
    const { error } = editing.id ? await supabase.from("lp_api_keys" as any).update(editing).eq("id", editing.id) : await supabase.from("lp_api_keys" as any).insert(editing);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["lp_api_keys"] });
  };
  const remove = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("lp_api_keys" as any).delete().eq("id", id); qc.invalidateQueries({ queryKey: ["lp_api_keys"] }); };
  const webhookUrl = functionUrl("lp-receive-lead");
  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copied"); };
  return (
    <div className="space-y-4">
      <div className="border border-border rounded-xl p-4 bg-muted/30 space-y-2">
        <div className="flex items-center gap-2 text-sm"><b>Webhook URL:</b><code className="bg-card px-2 py-1 rounded text-xs flex-1 truncate">{webhookUrl}</code><Button size="icon" variant="ghost" onClick={() => copy(webhookUrl)}><Copy className="w-3.5 h-3.5" /></Button></div>
        <p className="text-xs text-muted-foreground">Partners POST JSON <code>{`{ name, email, phone, city, state, course, source, cta }`}</code> with header <code>x-api-key: &lt;your_key&gt;</code>. Lead is inserted and auto-dispatched.</p>
      </div>
      <div className="flex justify-between"><p className="text-sm text-muted-foreground">Issue API keys to partners.</p><Button size="sm" onClick={() => { setEditing(blank); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />New Key</Button></div>
      <div className="grid gap-3">
        {(data || []).map((k: any) => (
          <div key={k.id} className="border border-border rounded-xl p-4 bg-card flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{k.name}</span>
                <Badge variant={k.is_active ? "default" : "secondary"} className="text-[10px]">{k.is_active ? "Active" : "Off"}</Badge>
                <Badge variant="outline" className="text-[10px]">{k.rate_limit_per_minute}/min</Badge>
                <Badge variant="outline" className="text-[10px]">{k.call_count || 0} calls</Badge>
              </div>
              <div className="flex items-center gap-1 mt-1"><code className="bg-muted px-2 py-0.5 rounded text-xs truncate flex-1">{k.api_key}</code><Button size="icon" variant="ghost" onClick={() => copy(k.api_key)}><Copy className="w-3.5 h-3.5" /></Button></div>
              {k.allowed_ips?.length > 0 && <p className="text-xs text-muted-foreground mt-1">IPs: {k.allowed_ips.join(", ")}</p>}
            </div>
            <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => { setEditing(k); setOpen(true); }}><Pencil className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={() => remove(k.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></div>
          </div>
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground py-8 text-center">No API keys yet.</p>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} API Key</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Partner Agency X" /></div>
              <div><Label>API Key</Label><Input value={editing.api_key} onChange={(e) => setEditing({ ...editing, api_key: e.target.value })} /></div>
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Rate Limit / min</Label><Input type="number" value={editing.rate_limit_per_minute} onChange={(e) => setEditing({ ...editing, rate_limit_per_minute: parseInt(e.target.value) || 60 })} /></div>
                <div><Label>Default Source</Label><Input value={editing.default_source || empty} onChange={(e) => setEditing({ ...editing, default_source: e.target.value })} /></div>
              </div>
              <div><Label>Allowed IPs (CSV; empty = any)</Label><Input value={toCsv(editing.allowed_ips)} onChange={(e) => setEditing({ ...editing, allowed_ips: fromCsv(e.target.value) })} placeholder="1.2.3.4, 5.6.7.8" /></div>
              <div><Label>Notes</Label><Textarea rows={2} value={editing.notes || empty} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            </div>
          )}
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───────── UTM Links ───────── */
function UtmLinksTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["lp_utm_links"], queryFn: async () => (await supabase.from("lp_utm_links" as any).select("*").order("created_at", { ascending: false })).data || [] });
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const blank: any = { slug: "", destination_url: "", utm_source: "", utm_medium: "", utm_campaign: "", utm_term: "", utm_content: "", is_active: true };
  const save = async () => {
    const { error } = editing.id ? await supabase.from("lp_utm_links" as any).update(editing).eq("id", editing.id) : await supabase.from("lp_utm_links" as any).insert(editing);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["lp_utm_links"] });
  };
  const remove = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("lp_utm_links" as any).delete().eq("id", id); qc.invalidateQueries({ queryKey: ["lp_utm_links"] }); };
  const base = `${functionUrl("lp-utm")}/`;
  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copied"); };
  return (
    <div className="space-y-4">
      <div className="flex justify-between"><p className="text-sm text-muted-foreground">Short UTM-tagged links. Visiting <code>{base}&lt;slug&gt;</code> redirects to destination with utm params and counts clicks.</p><Button size="sm" onClick={() => { setEditing(blank); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />New Link</Button></div>
      <div className="grid gap-3">
        {(data || []).map((l: any) => (
          <div key={l.id} className="border border-border rounded-xl p-4 bg-card flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">/{l.slug}</span>
                <Badge variant={l.is_active ? "default" : "secondary"} className="text-[10px]">{l.is_active ? "Active" : "Off"}</Badge>
                <Badge variant="outline" className="text-[10px]">{l.click_count} clicks</Badge>
              </div>
              <div className="flex items-center gap-1 mt-1"><code className="bg-muted px-2 py-0.5 rounded text-xs truncate flex-1">{base}{l.slug}</code><Button size="icon" variant="ghost" onClick={() => copy(base + l.slug)}><Copy className="w-3.5 h-3.5" /></Button></div>
              <p className="text-xs text-muted-foreground mt-1 truncate">→ {l.destination_url} ({[l.utm_source, l.utm_medium, l.utm_campaign].filter(Boolean).join(" / ") || "no utm"})</p>
            </div>
            <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => { setEditing(l); setOpen(true); }}><Pencil className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={() => remove(l.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></div>
          </div>
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground py-8 text-center">No links yet.</p>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} UTM Link</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Slug</Label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="mba-fb-jan" /></div>
                <div><Label>Destination URL</Label><Input value={editing.destination_url} onChange={(e) => setEditing({ ...editing, destination_url: e.target.value })} placeholder="https://dekhocampus.com/..." /></div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div><Label>utm_source</Label><Input value={editing.utm_source || empty} onChange={(e) => setEditing({ ...editing, utm_source: e.target.value })} /></div>
                <div><Label>utm_medium</Label><Input value={editing.utm_medium || empty} onChange={(e) => setEditing({ ...editing, utm_medium: e.target.value })} /></div>
                <div><Label>utm_campaign</Label><Input value={editing.utm_campaign || empty} onChange={(e) => setEditing({ ...editing, utm_campaign: e.target.value })} /></div>
                <div><Label>utm_term</Label><Input value={editing.utm_term || empty} onChange={(e) => setEditing({ ...editing, utm_term: e.target.value })} /></div>
                <div><Label>utm_content</Label><Input value={editing.utm_content || empty} onChange={(e) => setEditing({ ...editing, utm_content: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            </div>
          )}
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───────── Multi-Push (ad-hoc) ───────── */
function MultiPushTab() {
  const { data: unis } = useQuery({ queryKey: ["lp_universities_mp"], queryFn: async () => (await supabase.from("lp_universities" as any).select("id,name").eq("is_active", true).order("name")).data || [] });
  const [picked, setPicked] = useState<string[]>([]);
  const [leadId, setLeadId] = useState("");
  const [lead, setLead] = useState({ name: "", email: "", phone: "", city: "", state: "", course: "" });
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const togglePick = (id: string) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const push = async () => {
    if (!picked.length) return toast.error("Pick at least one university");
    setRunning(true);
    try {
      const body: any = { university_ids: picked };
      if (leadId) body.lead_id = leadId; else body.lead = lead;
      const { data, error } = await supabase.functions.invoke("lp-multi-push", { body });
      if (error) throw error;
      setResult(data); toast.success("Pushed");
    } catch (e: any) { toast.error(e.message); } finally { setRunning(false); }
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Push one lead to many universities right now (bypasses rules).</p>
      <div className="border border-border rounded-xl p-4 bg-card space-y-3">
        <div><Label>Existing Lead UUID (optional)</Label><Input value={leadId} onChange={(e) => setLeadId(e.target.value)} placeholder="leave empty to use form below" /></div>
        {!leadId && (
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>Name</Label><Input value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} /></div>
            <div><Label>City</Label><Input value={lead.city} onChange={(e) => setLead({ ...lead, city: e.target.value })} /></div>
            <div><Label>State</Label><Input value={lead.state} onChange={(e) => setLead({ ...lead, state: e.target.value })} /></div>
            <div><Label>Course</Label><Input value={lead.course} onChange={(e) => setLead({ ...lead, course: e.target.value })} /></div>
          </div>
        )}
        <div>
          <Label>Universities</Label>
          <div className="grid md:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto border border-border rounded-lg p-2 mt-1">
            {(unis || []).map((u: any) => <label key={u.id} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted cursor-pointer"><input type="checkbox" checked={picked.includes(u.id)} onChange={() => togglePick(u.id)} />{u.name}</label>)}
          </div>
        </div>
        <Button onClick={push} disabled={running}><Send className="w-4 h-4 mr-1" />{running ? "Pushing..." : `Push to ${picked.length} university(ies)`}</Button>
      </div>
      {result && <pre className="bg-muted p-3 rounded-xl text-xs overflow-auto max-h-96">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

export default function AdminLeadPush() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "universities";
  return (
    <AdminLayout title="Lead Push Automation">
      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2"><Network className="w-5 h-5 text-primary" />Lead Push Flow</h2>
        <p className="text-sm text-muted-foreground mt-1">Multi-Flow → Marketing Flow → Rules → Universities. Every new lead is auto-dispatched.</p>
      </div>
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })}>
        <TabsList className="flex flex-wrap h-auto mb-4">
          <TabsTrigger value="universities"><Building2 className="w-4 h-4 mr-1" />Universities</TabsTrigger>
          <TabsTrigger value="rules"><Filter className="w-4 h-4 mr-1" />Rules</TabsTrigger>
          <TabsTrigger value="flows"><GitBranch className="w-4 h-4 mr-1" />Marketing Flows</TabsTrigger>
          <TabsTrigger value="multi"><Network className="w-4 h-4 mr-1" />Multi-Flow</TabsTrigger>
          <TabsTrigger value="bulk"><Upload className="w-4 h-4 mr-1" />Bulk Upload</TabsTrigger>
          <TabsTrigger value="multipush"><Send className="w-4 h-4 mr-1" />Multi-Push</TabsTrigger>
          <TabsTrigger value="keys"><KeyRound className="w-4 h-4 mr-1" />Webhook Keys</TabsTrigger>
          <TabsTrigger value="utm"><Link2 className="w-4 h-4 mr-1" />UTM Links</TabsTrigger>
          <TabsTrigger value="logs"><ListChecks className="w-4 h-4 mr-1" />Logs / Test</TabsTrigger>
        </TabsList>
        <TabsContent value="universities"><UniversitiesTab /></TabsContent>
        <TabsContent value="rules"><RulesTab /></TabsContent>
        <TabsContent value="flows"><FlowsTab table="lp_marketing_flows" label='Group automation rules into a named flow.' picksFrom="lp_automation_rules" picksLabel="rules" /></TabsContent>
        <TabsContent value="multi"><FlowsTab table="lp_multi_flows" label="Compose multiple flows that fire on every new lead." picksFrom="lp_marketing_flows" picksLabel="flows" extraFields={(e, set) => (
          <div><Label>Trigger</Label>
            <Select value={e.trigger_event} onValueChange={(v) => set({ ...e, trigger_event: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="lead_insert">On new lead (auto)</SelectItem><SelectItem value="manual">Manual only</SelectItem></SelectContent>
            </Select>
          </div>
        )} /></TabsContent>
        <TabsContent value="bulk"><BulkUploadTab /></TabsContent>
        <TabsContent value="multipush"><MultiPushTab /></TabsContent>
        <TabsContent value="keys"><ApiKeysTab /></TabsContent>
        <TabsContent value="utm"><UtmLinksTab /></TabsContent>
        <TabsContent value="logs"><div className="space-y-6"><TestTab /><LogsTab /></div></TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
