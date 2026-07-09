import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, Send, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const API_TYPES = [
  { value: "meritto", label: "NoPaperForms / Meritto", desc: "Standard JSON with secret_key authentication" },
  { value: "leadsquared", label: "LeadSquared", desc: "Array of Attribute / Value pairs" },
  { value: "upgrad", label: "upGrad Lead-Drop", desc: "Nested JSON + Basic auth + UTM headers" },
  { value: "generic", label: "Custom JSON API", desc: "Generic JSON payload format" },
];

const DEFAULT_MAPPING_FIELDS = [
  "name", "email", "mobile", "address", "state", "city", "course", "specialization",
  "leadSource", "leadMedium", "leadCampaign", "university",
];

export type UniversityRow = any;

interface Props {
  open: boolean;
  initial: UniversityRow | null;
  existingNames: string[];
  onClose: () => void;
  onSaved: () => void;
}

const blank = (): UniversityRow => ({
  name: "", api_url: "", api_type: "meritto", college_id: "", secret_key: "",
  source: "dekhocampus", medium: "dekhocampus", campaign: "API",
  auth_type: "secret_key", auth_header_key: "Authorization", auth_header_value: "",
  custom_headers: {}, column_mapping: Object.fromEntries(DEFAULT_MAPPING_FIELDS.map((f) => [f, f])),
  static_fields: {}, university_defaults: {}, default_values: {},
  payload_wrapper: "object", leads_per_minute: 5, is_active: true, notes: "",
  programs: [], state_cities: [], course_specializations: [],
  utm_link: "", publisher_panel_url: "", publisher_id: "",
});

export default function UniversityFormDialog({ open, initial, existingNames, onClose, onSaved }: Props) {
  const [form, setForm] = useState<UniversityRow>(blank());
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setTestResult(null);
    if (initial) {
      setForm({ ...blank(), ...initial,
        column_mapping: initial.column_mapping || {},
        static_fields: initial.static_fields || {},
        custom_headers: initial.custom_headers || {},
        default_values: initial.default_values || {},
        programs: initial.programs || [],
        state_cities: initial.state_cities || [],
        course_specializations: initial.course_specializations || [],
      });
    } else {
      setForm(blank());
    }
  }, [open, initial]);

  const set = (patch: Partial<UniversityRow>) => setForm((f: UniversityRow) => ({ ...f, ...patch }));
  const nameDup = useMemo(() => {
    if (!form.name) return false;
    const lower = form.name.trim().toLowerCase();
    return existingNames.some((n) => n.toLowerCase() === lower && n.toLowerCase() !== (initial?.name || "").toLowerCase());
  }, [form.name, existingNames, initial]);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.api_url.trim()) return toast.error("API URL is required");
    if (nameDup) return toast.error("A university with this name already exists");
    setSaving(true);
    const payload = { ...form };
    delete payload.id;
    const { error } = initial?.id
      ? await supabase.from("lp_universities" as any).update(payload).eq("id", initial.id)
      : await supabase.from("lp_universities" as any).insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
    onClose();
  };

  const testApi = async () => {
    if (!initial?.id) return toast.error("Save first, then test");
    setTesting(true); setTestResult(null);
    const { data, error } = await supabase.functions.invoke("lp-test-api", { body: { university_id: initial.id } });
    setTesting(false);
    if (error) { setTestResult({ ok: false, msg: error.message }); return; }
    const ok = (data?.status === "success");
    setTestResult({ ok, msg: `${data?.status} • HTTP ${data?.httpStatus}` });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border sticky top-0 bg-background z-10">
          <DialogTitle className="text-xl flex items-center gap-2">
            {initial?.id ? "Edit University" : "Add University"}
            {form.api_type && <Badge variant="outline" className="text-[10px] font-normal">{API_TYPES.find((t) => t.value === form.api_type)?.label}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-4">
          <Tabs defaultValue="basic" className="mt-3">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="api">API &amp; Auth</TabsTrigger>
              <TabsTrigger value="mapping">Mapping</TabsTrigger>
              <TabsTrigger value="taxonomy">Taxonomy</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* BASIC */}
            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>University Name *</Label>
                  <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. upGrad Online MBA" />
                  {nameDup && <p className="text-xs text-destructive mt-1">Name already exists</p>}
                </div>
                <div>
                  <Label>API Type</Label>
                  <Select value={form.api_type} onValueChange={(v) => set({ api_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {API_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div>
                            <div className="font-medium">{t.label}</div>
                            <div className="text-[10px] text-muted-foreground">{t.desc}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div><Label>UTM Source</Label><Input value={form.source || ""} onChange={(e) => set({ source: e.target.value })} /></div>
                <div><Label>UTM Medium</Label><Input value={form.medium || ""} onChange={(e) => set({ medium: e.target.value })} /></div>
                <div><Label>UTM Campaign</Label><Input value={form.campaign || ""} onChange={(e) => set({ campaign: e.target.value })} /></div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Leads / minute</Label><Input type="number" min={1} max={1000} value={form.leads_per_minute || 5} onChange={(e) => set({ leads_per_minute: parseInt(e.target.value) || 5 })} /></div>
                <div className="flex items-center gap-3 pt-6"><Switch checked={!!form.is_active} onCheckedChange={(v) => set({ is_active: v })} /><Label>Active</Label></div>
              </div>
              <div><Label>Notes</Label><Textarea rows={2} value={form.notes || ""} onChange={(e) => set({ notes: e.target.value })} placeholder="Internal notes about this integration" /></div>
              <div className="grid md:grid-cols-3 gap-3">
                <div><Label>UTM Link</Label><Input value={form.utm_link || ""} onChange={(e) => set({ utm_link: e.target.value })} placeholder="https://…" /></div>
                <div><Label>Publisher Panel URL</Label><Input value={form.publisher_panel_url || ""} onChange={(e) => set({ publisher_panel_url: e.target.value })} /></div>
                <div><Label>Publisher ID</Label><Input value={form.publisher_id || ""} onChange={(e) => set({ publisher_id: e.target.value })} /></div>
              </div>
            </TabsContent>

            {/* API & AUTH */}
            <TabsContent value="api" className="space-y-4 pt-4">
              <div><Label>API URL *</Label><Input value={form.api_url} onChange={(e) => set({ api_url: e.target.value })} placeholder="https://crm.example.com/api/lead" /></div>
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>College / Client ID</Label><Input value={form.college_id || ""} onChange={(e) => set({ college_id: e.target.value })} /></div>
                <div><Label>Secret Key</Label><Input value={form.secret_key || ""} onChange={(e) => set({ secret_key: e.target.value })} /></div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Auth Type</Label>
                  <Select value={form.auth_type} onValueChange={(v) => set({ auth_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="secret_key">Secret Key (in payload)</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="custom_header">Custom Header</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payload Wrapper</Label>
                  <Select value={form.payload_wrapper} onValueChange={(v) => set({ payload_wrapper: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="object">Object {`{...}`}</SelectItem>
                      <SelectItem value="array">Array {`[{...}]`}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.auth_type === "custom_header" && (
                <div className="grid md:grid-cols-2 gap-3">
                  <div><Label>Header Key</Label><Input value={form.auth_header_key || ""} onChange={(e) => set({ auth_header_key: e.target.value })} /></div>
                  <div><Label>Header Value</Label><Input value={form.auth_header_value || ""} onChange={(e) => set({ auth_header_value: e.target.value })} /></div>
                </div>
              )}
              {(form.auth_type === "bearer" || form.auth_type === "basic") && (
                <div><Label>{form.auth_type === "bearer" ? "Bearer Token" : "Basic Auth (user:pass)"}</Label><Input value={form.auth_header_value || ""} onChange={(e) => set({ auth_header_value: e.target.value })} /></div>
              )}
              <KeyValueEditor label="Custom Headers" value={form.custom_headers || {}} onChange={(v) => set({ custom_headers: v })} keyPh="X-Custom-Header" valPh="value" />
              <div className="border border-border rounded-lg p-3 bg-muted/30 flex items-center justify-between">
                <div className="text-sm">Send a test lead to verify the integration.</div>
                <div className="flex items-center gap-3">
                  {testResult && (
                    <span className={`text-xs font-medium ${testResult.ok ? "text-emerald-500" : "text-destructive"}`}>{testResult.msg}</span>
                  )}
                  <Button size="sm" variant="outline" onClick={testApi} disabled={testing || !initial?.id}>
                    <Send className="w-3.5 h-3.5 mr-1" />{testing ? "Testing…" : "Test API"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* MAPPING */}
            <TabsContent value="mapping" className="space-y-4 pt-4">
              <p className="text-xs text-muted-foreground flex items-start gap-1.5"><Info className="w-3.5 h-3.5 mt-0.5" />Map your standard field name to whatever this CRM expects. Default values are used when a lead is missing that field.</p>
              <MappingEditor
                mapping={form.column_mapping || {}}
                defaults={form.default_values || {}}
                onChange={(m, d) => set({ column_mapping: m, default_values: d })}
              />
              <KeyValueEditor label="Static Fields (always sent)" value={form.static_fields || {}} onChange={(v) => set({ static_fields: v })} keyPh="country" valPh="India" />
            </TabsContent>

            {/* TAXONOMY */}
            <TabsContent value="taxonomy" className="space-y-5 pt-4">
              <ListEditor label="Programs" items={form.programs || []} onChange={(items) => set({ programs: items })} placeholder="MBA" />
              <PairEditor label="State → City" items={form.state_cities || []} keyA="state" keyB="city" onChange={(items) => set({ state_cities: items })} />
              <PairEditor label="Course → Specialization" items={form.course_specializations || []} keyA="course" keyB="specialization" onChange={(items) => set({ course_specializations: items })} />
            </TabsContent>

            {/* ADVANCED */}
            <TabsContent value="advanced" className="space-y-4 pt-4">
              <KeyValueEditor label="Multi-Push University Defaults" value={form.university_defaults || {}} onChange={(v) => set({ university_defaults: v })} keyPh="course" valPh="MBA" />
              <p className="text-xs text-muted-foreground">Defaults used only during Multi-Push fan-out when the source CSV does not specify the value.</p>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border sticky bottom-0 bg-background">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || nameDup} className="bg-orange-500 hover:bg-orange-600 text-white">
            {saving ? "Saving…" : initial?.id ? "Update University" : "Save University"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Reusable editors ── */

function KeyValueEditor({ label, value, onChange, keyPh, valPh }: { label: string; value: Record<string, string>; onChange: (v: Record<string, string>) => void; keyPh?: string; valPh?: string }) {
  const entries = Object.entries(value || {});
  const update = (i: number, k: string, v: string) => {
    const next: Record<string, string> = {};
    entries.forEach(([ek, ev], idx) => { if (idx === i) next[k] = v; else next[ek] = ev; });
    onChange(next);
  };
  const add = () => onChange({ ...value, "": "" });
  const remove = (k: string) => { const next = { ...value }; delete next[k]; onChange(next); };
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>{label}</Label>
        <Button size="sm" variant="outline" onClick={add}><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
      </div>
      <div className="space-y-2">
        {entries.length === 0 && <p className="text-xs text-muted-foreground italic">No entries.</p>}
        {entries.map(([k, v], i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <Input placeholder={keyPh || "key"} value={k} onChange={(e) => update(i, e.target.value, v)} />
            <Input placeholder={valPh || "value"} value={v} onChange={(e) => update(i, k, e.target.value)} />
            <Button size="icon" variant="ghost" onClick={() => remove(k)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MappingEditor({ mapping, defaults, onChange }: { mapping: Record<string, string>; defaults: Record<string, string>; onChange: (m: Record<string, string>, d: Record<string, string>) => void }) {
  const keys = Array.from(new Set([...DEFAULT_MAPPING_FIELDS, ...Object.keys(mapping)]));
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-3 py-2 bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        <div>Standard Field</div><div>CRM Field Name</div><div>Default Value</div><div></div>
      </div>
      <div className="divide-y divide-border">
        {keys.map((k) => (
          <div key={k} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-3 py-2 items-center">
            <div className="text-sm font-mono">{k}</div>
            <Input value={mapping[k] ?? k} onChange={(e) => onChange({ ...mapping, [k]: e.target.value }, defaults)} placeholder={k} />
            <Input value={defaults[k] ?? ""} onChange={(e) => onChange(mapping, { ...defaults, [k]: e.target.value })} placeholder="-" />
            <Button size="icon" variant="ghost" onClick={() => { const m = { ...mapping }; const d = { ...defaults }; delete m[k]; delete d[k]; onChange(m, d); }}>
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-border bg-muted/20">
        <Button size="sm" variant="ghost" onClick={() => {
          const newKey = prompt("Custom field name (e.g. utm_term)")?.trim();
          if (newKey) onChange({ ...mapping, [newKey]: newKey }, defaults);
        }}><Plus className="w-3.5 h-3.5 mr-1" />Add Custom Field</Button>
      </div>
    </div>
  );
}

function ListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => { const v = draft.trim(); if (!v) return; onChange([...items, v]); setDraft(""); };
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 mt-1">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
        <Button size="sm" variant="outline" onClick={add}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {items.map((it, i) => (
          <Badge key={i} variant="secondary" className="gap-1 pr-1">
            {it}
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="hover:text-destructive ml-1"><Trash2 className="w-3 h-3" /></button>
          </Badge>
        ))}
        {items.length === 0 && <span className="text-xs text-muted-foreground italic">None added.</span>}
      </div>
    </div>
  );
}

function PairEditor({ label, items, onChange, keyA, keyB }: { label: string; items: any[]; onChange: (v: any[]) => void; keyA: string; keyB: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>{label}</Label>
        <Button size="sm" variant="outline" onClick={() => onChange([...items, { [keyA]: "", [keyB]: "" }])}><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
      </div>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-xs text-muted-foreground italic">No entries.</p>}
        {items.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <Input placeholder={keyA} value={row[keyA] || ""} onChange={(e) => { const next = [...items]; next[i] = { ...next[i], [keyA]: e.target.value }; onChange(next); }} />
            <Input placeholder={keyB} value={row[keyB] || ""} onChange={(e) => { const next = [...items]; next[i] = { ...next[i], [keyB]: e.target.value }; onChange(next); }} />
            <Button size="icon" variant="ghost" onClick={() => onChange(items.filter((_, idx) => idx !== i))}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
