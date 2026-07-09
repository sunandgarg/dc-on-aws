import { useMemo, useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import {
  Plus, Search, Zap, Activity, Building2, Target, Settings2, Trash2, Play, Sparkles,
  CheckCircle2, XCircle, AlertCircle, Clock, ChevronRight, Filter, Workflow, Rocket, X, Check, ChevronsUpDown, BookOpen,
} from "lucide-react";
import { useDraftState } from "@/hooks/useDraftState";


type Rule = {
  id: string;
  name: string;
  description: string;
  priority: number;
  is_active: boolean;
  auto_dispatch: boolean;
  match_all: boolean;
  match_cities: string[];
  match_states: string[];
  match_courses: string[];
  match_sources: string[];
  match_ctas: string[];
  university_ids: string[];
  prefills: Record<string, Record<string, Record<string, any>>>; // {uniId: {scenario: {field: mapping}}}
};

type Uni = { id: string; name: string; api_url: string; api_type: string; is_active: boolean; column_mapping: any; default_values: any };

const LEAD_SELECT = "id,name,email,phone,city,state,source,initial_query,interested_college_slug,interested_course_slug,cta,created_at";

const STATUS_COLORS: Record<string, string> = {
  Success: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  Duplicate: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  Fail: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  RateLimited: "bg-blue-500/15 text-blue-600 border-blue-500/30",
};

function Chips({ items, color = "orange", onRemove }: { items: string[]; color?: string; onRemove?: (i: number) => void }) {
  if (!items.length) return <span className="text-xs text-muted-foreground italic">any</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((it, i) => (
        <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-${color}-500/10 text-${color}-600 border border-${color}-500/20`}>
          {it}
          {onRemove && <button onClick={() => onRemove(i)} className="hover:text-rose-500"><X className="w-3 h-3" /></button>}
        </span>
      ))}
    </div>
  );
}

function ChipInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [t, setT] = useState("");
  const add = () => {
    const v = t.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setT("");
  };
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1 min-h-[28px] p-1.5 border border-border rounded-lg bg-muted/30">
        {value.map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-500/15 text-orange-600">
            {v}
            <button onClick={() => onChange(value.filter((_, idx) => idx !== i))}><X className="w-3 h-3" /></button>
          </span>
        ))}
        <input
          value={t}
          onChange={(e) => setT(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
          onBlur={add}
          placeholder={placeholder}
          className="flex-1 min-w-[100px] bg-transparent outline-none text-sm px-1"
        />
      </div>
    </div>
  );
}

type Opt = { value: string; label: string; hint?: string };

function SearchableMultiSelect({
  value, onChange, options, placeholder = "Search…", allowCustom = true, emptyText = "No matches",
}: {
  value: string[]; onChange: (v: string[]) => void; options: Opt[];
  placeholder?: string; allowCustom?: boolean; emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label || v;
  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  const addCustom = () => {
    const q = query.trim();
    if (!q) return;
    if (!value.includes(q)) onChange([...value, q]);
    setQuery("");
  };
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1 min-h-[36px] p-1.5 border border-border rounded-lg bg-background">
        {value.length === 0 && <span className="text-xs text-muted-foreground italic px-1.5 py-1">none - matches any</span>}
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-500/15 text-orange-600 border border-orange-500/20">
            {labelOf(v)}
            <button onClick={() => toggle(v)}><X className="w-3 h-3" /></button>
          </span>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-1.5 py-1 rounded">
              <Plus className="w-3 h-3" /> add <ChevronsUpDown className="w-3 h-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <Command shouldFilter>
              <CommandInput value={query} onValueChange={setQuery} placeholder={placeholder} />
              <CommandList>
                <CommandEmpty>
                  {allowCustom && query.trim() ? (
                    <button onClick={addCustom} className="text-sm px-3 py-2 hover:bg-muted w-full text-left">
                      <Plus className="w-3 h-3 inline mr-1" /> Add custom: <span className="font-mono">{query.trim()}</span>
                    </button>
                  ) : (
                    <div className="py-3 text-center text-xs text-muted-foreground">{emptyText}</div>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {options.map((o) => (
                    <CommandItem key={o.value} value={`${o.label} ${o.value} ${o.hint || ""}`} onSelect={() => toggle(o.value)}>
                      <Check className={`w-3.5 h-3.5 mr-2 ${value.includes(o.value) ? "opacity-100 text-orange-500" : "opacity-0"}`} />
                      <div className="flex-1">
                        <div className="text-sm">{o.label}</div>
                        {o.hint && <div className="text-[10px] text-muted-foreground">{o.hint}</div>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

/** Parse a university's column_mapping into the list of fields it accepts. */
type UniField = { key: string; label: string; required: boolean; sourceType?: string; sourceKey?: string; staticValue?: string };
function parseUniversityFields(uni: Uni): UniField[] {
  const cm = uni.column_mapping || {};
  const fields: UniField[] = [];
  const seen = new Set<string>();
  // 1. __field_* JSON descriptors
  for (const [k, v] of Object.entries(cm)) {
    if (!k.startsWith("__field_")) continue;
    try {
      const parsed = typeof v === "string" ? JSON.parse(v as string) : (v as any);
      const key = parsed?.fieldName;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      fields.push({
        key,
        label: parsed.displayName || key,
        required: !!parsed.isRequired,
        sourceType: parsed.sourceType,
        sourceKey: parsed.sourceKey,
        staticValue: parsed.staticValue,
      });
    } catch { /* ignore */ }
  }
  // 2. Plain top-level mappings (e.g. "city": "city")
  for (const [k, v] of Object.entries(cm)) {
    if (k.startsWith("__") || seen.has(k)) continue;
    if (typeof v !== "string") continue;
    seen.add(k);
    fields.push({ key: k, label: k, required: false, sourceType: "lead_data", sourceKey: v as string });
  }
  // 3. Default values keys
  for (const k of Object.keys(uni.default_values || {})) {
    if (seen.has(k)) continue;
    seen.add(k);
    fields.push({ key: k, label: k, required: false, sourceType: "static", staticValue: (uni.default_values as any)[k] });
  }
  return fields.sort((a, b) => Number(b.required) - Number(a.required) || a.key.localeCompare(b.key));
}


export default function AdminMarketingAutomation() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("rules");
  const [editing, setEditing] = useDraftState<Rule | null>('admin.marketing-automation.editing.v1', null);
  const [prefillFor, setPrefillFor] = useState<Rule | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  const { data: rules = [], refetch: refetchRules } = useQuery<Rule[]>({
    queryKey: ["lp_automation_rules"],
    queryFn: async () => ((await supabase.from("lp_automation_rules" as any).select("*").order("priority")).data || []) as any,
  });
  const { data: unis = [] } = useQuery<Uni[]>({
    queryKey: ["lp_universities_marketing"],
    queryFn: async () => ((await supabase.from("universities" as any).select("id,name,api_url,api_type,column_mapping,default_values,leads_per_minute").order("name")).data || []).map((u: any) => ({ ...u, is_active: true })) as any,
  });
  const { data: logs = [] } = useQuery<any[]>({
    queryKey: ["lp_push_logs_recent"],
    queryFn: async () => ((await supabase.from("lp_push_logs" as any).select("*").order("created_at", { ascending: false }).limit(80)).data || []) as any,
    refetchInterval: 15000,
  });
  const { data: recentLeads = [] } = useQuery<any[]>({
    queryKey: ["leads_all_for_routing"],
    queryFn: async () => ((await supabase.from("leads").select(LEAD_SELECT).order("created_at", { ascending: false }).limit(1000)).data || []) as any,
  });

  const uniMap = useMemo(() => new Map(unis.map((u) => [u.id, u])), [unis]);

  const stats = useMemo(() => {
    const active = rules.filter((r) => r.is_active).length;
    const todayKey = new Date(); todayKey.setHours(0, 0, 0, 0);
    const today = logs.filter((l) => new Date(l.created_at) >= todayKey);
    const success = today.filter((l) => l.status === "Success").length;
    return {
      activeRules: active,
      dispatchedToday: today.length,
      successRate: today.length ? Math.round((success / today.length) * 100) : 0,
      partnerUnis: unis.filter((u) => u.is_active).length,
    };
  }, [rules, logs, unis]);

  const filteredRules = useMemo(() => {
    if (!search.trim()) return rules;
    const q = search.toLowerCase();
    return rules.filter((r) => {
      const hay = [r.name, r.description, ...r.match_cities, ...r.match_states, ...r.match_courses, ...r.match_sources, ...r.match_ctas].join(" ").toLowerCase();
      const uniHits = (r.university_ids || []).some((id) => uniMap.get(id)?.name?.toLowerCase().includes(q));
      return hay.includes(q) || uniHits;
    });
  }, [rules, search, uniMap]);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter((l) => {
      const u = uniMap.get(l.university_id)?.name?.toLowerCase() || "";
      return u.includes(q) || (l.status || "").toLowerCase().includes(q) || (l.error || "").toLowerCase().includes(q);
    });
  }, [logs, search, uniMap]);

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return recentLeads;
    const q = search.toLowerCase();
    return recentLeads.filter((l) =>
      [l.name, l.phone, l.city, l.state, l.source, l.interested_course_slug, l.cta].join(" ").toLowerCase().includes(q),
    );
  }, [recentLeads, search]);

  const createRule = async () => {
    const { data, error } = await supabase.from("lp_automation_rules" as any).insert({
      name: `New Routing Rule ${rules.length + 1}`,
      description: "", priority: 100, is_active: true, auto_dispatch: true, match_all: false,
      match_cities: [], match_states: [], match_courses: [], match_sources: [], match_ctas: [],
      university_ids: [], prefills: {},
    } as any).select().single();
    if (error) return toast.error(error.message);
    toast.success("Rule created");
    refetchRules();
    setEditing(data as any);
  };

  const toggleActive = async (r: Rule, key: "is_active" | "auto_dispatch") => {
    await supabase.from("lp_automation_rules" as any).update({ [key]: !r[key] } as any).eq("id", r.id);
    refetchRules();
  };
  const removeRule = async (id: string) => {
    if (!confirm("Delete this routing rule?")) return;
    await supabase.from("lp_automation_rules" as any).delete().eq("id", id);
    refetchRules();
    toast.success("Deleted");
  };

  return (
    <AdminLayout title="Lead Push Automation">
      <div className="space-y-6 max-w-[1400px]">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-rose-500 p-8 text-white shadow-xl">
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-semibold tracking-wide mb-3">
                <Sparkles className="w-3.5 h-3.5" /> AUTOMATION ENGINE · 2026
              </div>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">Easy Lead Push Setup</h1>
              <p className="text-white/85 mt-1.5 text-sm md:text-base max-w-2xl">
                Choose which leads should go where, then tell each university exactly what value it should receive - full name, first name, mobile, email, course, or fixed values.
              </p>
            </div>
            <Button onClick={createRule} className="bg-white text-orange-600 hover:bg-white/95 shadow-lg shrink-0">
              <Plus className="w-4 h-4 mr-1.5" /> Create Simple Rule
            </Button>
          </div>
          <div className="relative grid md:grid-cols-3 gap-3 mt-6">
            <GuideStep n="1" title="Select leads" text="Pick course, city, state, source, or campaign from your database." />
            <GuideStep n="2" title="Select universities" text="Choose all partner universities that should receive matching leads." />
            <GuideStep n="3" title="Set sent values" text="For each university, choose normal setup, lead field, or fixed value." />
          </div>
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-7">
            <KPI icon={Target} label="Active Rules" value={stats.activeRules} />
            <KPI icon={Rocket} label="Dispatched Today" value={stats.dispatchedToday} />
            <KPI icon={Activity} label="Success Rate" value={`${stats.successRate}%`} />
            <KPI icon={Building2} label="Partner Universities" value={stats.partnerUnis} />
          </div>
        </div>

        {/* Global search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules, universities, courses, leads, dispatch logs…"
            className="pl-11 h-12 text-base rounded-xl border-2 focus-visible:border-orange-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-xl">
            <TabsTrigger value="rules" className="gap-1.5"><Workflow className="w-4 h-4" /> 1. Rules ({filteredRules.length})</TabsTrigger>
            <TabsTrigger value="prefills" className="gap-1.5"><Settings2 className="w-4 h-4" /> 2. University Values</TabsTrigger>
            <TabsTrigger value="tester" className="gap-1.5"><Play className="w-4 h-4" /> 3. Test Before Push</TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5"><Activity className="w-4 h-4" /> Dispatch Logs ({filteredLogs.length})</TabsTrigger>
            <TabsTrigger value="leads" className="gap-1.5"><Filter className="w-4 h-4" /> All Leads ({filteredLeads.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-5">
            {filteredRules.length === 0 ? (
              <EmptyState onCreate={createRule} />
            ) : (
              <div className="grid gap-3">
                {filteredRules.map((r) => (
                  <RuleCard key={r.id} rule={r} unis={unis} uniMap={uniMap} onEdit={() => setEditing(r)} onPrefills={() => setPrefillFor(r)} onToggle={(k) => toggleActive(r, k)} onDelete={() => removeRule(r.id)} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="prefills" className="mt-5">
            <PrefillStudio rules={rules} unis={unis} onSaved={() => refetchRules()} />
          </TabsContent>

          <TabsContent value="tester" className="mt-5">
            <LiveTester rules={rules} unis={unis} recentLeads={recentLeads} selectedLead={selectedLead} />
          </TabsContent>

          <TabsContent value="logs" className="mt-5">
            <LogsTable logs={filteredLogs} unis={uniMap} />
          </TabsContent>

          <TabsContent value="leads" className="mt-5">
            <LeadsTable leads={filteredLeads} onTest={(l) => { setSelectedLead(l); setTab("tester"); }} />
          </TabsContent>
        </Tabs>
      </div>


      {editing && (
        <RuleEditor rule={editing} unis={unis} onClose={() => { setEditing(null); refetchRules(); }} />
      )}
      {prefillFor && (
        <PrefillMatrix rule={prefillFor} unis={unis} onClose={() => { setPrefillFor(null); refetchRules(); }} />
      )}
    </AdminLayout>
  );
}

function KPI({ icon: Icon, label, value }: any) {
  return (
    <div className="bg-white/15 backdrop-blur rounded-2xl p-4 border border-white/20">
      <div className="flex items-center gap-2 text-white/80 text-[11px] uppercase tracking-wider font-semibold">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="text-2xl md:text-3xl font-bold mt-1.5">{value}</div>
    </div>
  );
}

function GuideStep({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-white/15 border border-white/20 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-white font-semibold text-sm">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-orange-600 text-xs">{n}</span>
        {title}
      </div>
      <p className="text-white/80 text-xs mt-2 leading-relaxed">{text}</p>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="p-12 text-center border-dashed">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-rose-500/20 flex items-center justify-center mx-auto mb-4">
        <Workflow className="w-8 h-8 text-orange-500" />
      </div>
      <h3 className="text-lg font-semibold">No routing rules yet</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        Create a rule like "B.Tech in Delhi → push to College A, B, C" and incoming leads will route automatically.
      </p>
      <Button onClick={onCreate} className="mt-5 bg-orange-500 hover:bg-orange-600 text-white">
        <Plus className="w-4 h-4 mr-1.5" /> Create your first rule
      </Button>
    </Card>
  );
}

function RuleCard({ rule, unis, uniMap, onEdit, onPrefills, onToggle, onDelete }: any) {
  const targets = (rule.university_ids || []).map((id: string) => uniMap.get(id)).filter(Boolean);
  const filterCount = (rule.match_courses || []).length + (rule.match_cities || []).length + (rule.match_states || []).length + (rule.match_sources || []).length + (rule.match_ctas || []).length;
  return (
    <Card className="p-5 hover:border-orange-500/40 transition-all group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base truncate">{rule.name}</h3>
            <Badge variant="outline" className={rule.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground"}>
              {rule.is_active ? "Active" : "Paused"}
            </Badge>
            {rule.auto_dispatch && <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30 gap-1"><Zap className="w-3 h-3" /> Auto</Badge>}
            <Badge variant="outline" className="text-xs">Priority {rule.priority}</Badge>
            <Badge variant="outline" className="text-xs">{rule.match_all ? "Must match all selected filters" : "Can match any selected filter"}</Badge>
          </div>
          {rule.description && <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>}
          <div className="mt-3 rounded-lg border bg-muted/20 px-3 py-2 text-sm">
            <span className="font-medium">Plain meaning:</span>{" "}
            {filterCount ? "If a lead matches the selected filters below" : "Every lead can match this rule"} → send it to {targets.length || "no"} selected {targets.length === 1 ? "university" : "universities"}.
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 text-sm">
            <FilterRow label="Courses" items={rule.match_courses} />
            <FilterRow label="Cities" items={rule.match_cities} />
            <FilterRow label="States" items={rule.match_states} />
            <FilterRow label="Sources" items={rule.match_sources} />
            <FilterRow label="CTAs" items={rule.match_ctas} />
          </div>

          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> Push to {targets.length} {targets.length === 1 ? "university" : "universities"}
            </div>
            {targets.length === 0 ? (
              <span className="text-xs text-rose-500 italic">No target universities - pick at least one</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {targets.map((u: any) => (
                  <span key={u.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 text-blue-600 text-xs font-medium border border-blue-500/20">
                    <Building2 className="w-3 h-3" /> {u.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onPrefills} className="text-orange-600 hover:bg-orange-500/10">
              <Settings2 className="w-3.5 h-3.5 mr-1" /> Set Values
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit}>Edit Rule</Button>
            <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Active</span>
            <Switch checked={rule.is_active} onCheckedChange={() => onToggle("is_active")} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function FilterRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <Chips items={items || []} />
    </div>
  );
}

function useRuleOptions() {
  const { data: courses = [] } = useQuery<Opt[]>({
    queryKey: ["lp_opts_courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("slug,name").order("name").limit(2000);
      return (data || []).map((c: any) => ({ value: c.slug, label: c.name, hint: c.slug }));
    },
  });
  const { data: colleges = [] } = useQuery<Opt[]>({
    queryKey: ["lp_opts_colleges"],
    queryFn: async () => {
      const { data } = await supabase.from("colleges").select("slug,name,city,state").order("name").limit(3000);
      return (data || []).map((c: any) => ({ value: c.slug, label: c.name, hint: [c.city, c.state].filter(Boolean).join(", ") }));
    },
  });
  const { data: leadFacets = { cities: [], states: [], sources: [], ctas: [] } } = useQuery<any>({
    queryKey: ["lp_opts_lead_facets"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("city,state,source,cta").limit(5000);
      const cities = new Set<string>(), states = new Set<string>(), sources = new Set<string>(), ctas = new Set<string>();
      (data || []).forEach((l: any) => {
        if (l.city) cities.add(l.city);
        if (l.state) states.add(l.state);
        if (l.source) sources.add(l.source);
        if (l.cta) ctas.add(l.cta);
      });
      const toOpts = (s: Set<string>) => Array.from(s).sort().map((x) => ({ value: x, label: x }));
      return { cities: toOpts(cities), states: toOpts(states), sources: toOpts(sources), ctas: toOpts(ctas) };
    },
  });
  return { courses, colleges, cities: leadFacets.cities, states: leadFacets.states, sources: leadFacets.sources, ctas: leadFacets.ctas };
}

function RuleEditor({ rule, unis, onClose }: { rule: Rule; unis: Uni[]; onClose: () => void }) {
  const [r, setR] = useState<Rule>(rule);
  const [saving, setSaving] = useState(false);
  const [uniQuery, setUniQuery] = useState("");
  const set = <K extends keyof Rule>(k: K, v: Rule[K]) => setR((p) => ({ ...p, [k]: v }));
  const opts = useRuleOptions();

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("lp_automation_rules" as any).update({
      name: r.name, description: r.description, priority: r.priority, is_active: r.is_active, auto_dispatch: r.auto_dispatch,
      match_all: r.match_all, match_cities: r.match_cities, match_states: r.match_states, match_courses: r.match_courses,
      match_sources: r.match_sources, match_ctas: r.match_ctas, university_ids: r.university_ids,
    } as any).eq("id", r.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onClose();
  };

  const toggleUni = (id: string) =>
    set("university_ids", r.university_ids.includes(id) ? r.university_ids.filter((x) => x !== id) : [...r.university_ids, id]);

  const filteredUnis = useMemo(() => {
    const q = uniQuery.trim().toLowerCase();
    if (!q) return unis;
    return unis.filter((u) => u.name.toLowerCase().includes(q) || (u.api_type || "").toLowerCase().includes(q));
  }, [unis, uniQuery]);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Simple Rule Builder</SheetTitle>
          <SheetDescription>Step 1: choose leads from database dropdowns. Step 2: choose all universities that should receive those leads.</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 mt-5">
          <div>
            <Label>Name</Label>
            <Input value={r.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={r.description || ""} onChange={(e) => set("description", e.target.value)} rows={2} />
          </div>
          <Card className="p-3 bg-muted/20">
            <div className="text-sm font-semibold mb-1">How this rule works</div>
            <div className="text-xs text-muted-foreground">Example: choose B.Tech + Delhi + Google Ads, then select University A and B. Matching leads will automatically push to both universities.</div>
          </Card>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Priority (lower runs first)</Label>
              <Input type="number" value={r.priority} onChange={(e) => set("priority", parseInt(e.target.value) || 100)} />
            </div>
            <div className="flex items-end gap-2"><Switch checked={r.is_active} onCheckedChange={(v) => set("is_active", v)} /><Label>Active</Label></div>
            <div className="flex items-end gap-2"><Switch checked={r.auto_dispatch} onCheckedChange={(v) => set("auto_dispatch", v)} /><Label>Auto push</Label></div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border">
            <Switch checked={r.match_all} onCheckedChange={(v) => set("match_all", v)} />
            <div className="text-sm">
              <div className="font-medium">{r.match_all ? "Match ALL filters" : "Match ANY filter"}</div>
              <div className="text-xs text-muted-foreground">
                {r.match_all ? "Lead must match every selected condition." : "Lead can match any selected condition. Keep empty groups as Any."}
              </div>
            </div>
          </div>

          <Separator />
          <div className="space-y-3">
            <div>
              <Label className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Course interest ({r.match_courses.length})</Label>
              <SearchableMultiSelect value={r.match_courses} onChange={(v) => set("match_courses", v)} options={opts.courses} placeholder="Search courses (btech, mba, bca…)" />
            </div>
            <div>
              <Label>Lead city ({r.match_cities.length})</Label>
              <SearchableMultiSelect value={r.match_cities} onChange={(v) => set("match_cities", v)} options={opts.cities} placeholder="Pick a city from leads" />
            </div>
            <div>
              <Label>Lead state ({r.match_states.length})</Label>
              <SearchableMultiSelect value={r.match_states} onChange={(v) => set("match_states", v)} options={opts.states} placeholder="Pick a state" />
            </div>
            <div>
              <Label>Lead source ({r.match_sources.length})</Label>
              <SearchableMultiSelect value={r.match_sources} onChange={(v) => set("match_sources", v)} options={opts.sources} placeholder="Pick a lead source" />
            </div>
            <div>
              <Label>Campaign / CTA ({r.match_ctas.length})</Label>
              <SearchableMultiSelect value={r.match_ctas} onChange={(v) => set("match_ctas", v)} options={opts.ctas} placeholder="Pick a CTA" />
            </div>
          </div>

          <Separator />
          <div>
            <Label className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Target Universities ({r.university_ids.length} selected)</Label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={uniQuery} onChange={(e) => setUniQuery(e.target.value)} placeholder="Search universities…" className="pl-9 h-9" />
            </div>
            <div className="mt-2 max-h-72 overflow-y-auto border rounded-lg divide-y">
              {filteredUnis.map((u) => (
                <label key={u.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/40 cursor-pointer">
                  <input type="checkbox" checked={r.university_ids.includes(u.id)} onChange={() => toggleUni(u.id)} className="accent-orange-500 w-4 h-4" />
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{u.name}</span>
                  <Badge variant="outline" className="text-[10px]">{u.api_type}</Badge>
                </label>
              ))}
              {filteredUnis.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">No matching universities.</div>}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">{saving ? "Saving…" : "Save Rule"}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Build the list of scenarios available for a rule. Each scenario maps to a key inside prefills[uniId]. */
type Scenario = { key: string; label: string; group: "Fallback" | "Course" | "Campaign" | "Source" | "City" };
function buildScenarios(rule: Rule, courseLabels: Map<string, string>): Scenario[] {
  const list: Scenario[] = [{ key: "*", label: "Normal fallback for all matching leads", group: "Fallback" }];
  (rule.match_courses || []).forEach((s) => list.push({ key: `course:${s}`, label: `Only when course is ${courseLabels.get(s) || s}`, group: "Course" }));
  (rule.match_ctas || []).forEach((s) => list.push({ key: `campaign:${s}`, label: `Only when campaign / CTA is ${s}`, group: "Campaign" }));
  (rule.match_sources || []).forEach((s) => list.push({ key: `source:${s}`, label: `Only when source is ${s}`, group: "Source" }));
  (rule.match_cities || []).forEach((s) => list.push({ key: `city:${s}`, label: `Only when city is ${s}`, group: "City" }));
  return list;
}

function PrefillMatrix({ rule, unis, onClose }: { rule: Rule; unis: Uni[]; onClose: () => void }) {
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-5xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>University Value Setup - {rule.name}</SheetTitle>
          <SheetDescription>
            Choose one university, choose when this setup applies, then select what value each college field should receive.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-5">
          <PrefillEditor rule={rule} unis={unis} onSaved={onClose} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PrefillStudio({ rules, unis, onSaved }: { rules: Rule[]; unis: Uni[]; onSaved: () => void }) {
  const preferredRule = rules.find((r) => (r.university_ids || []).length > 0) || rules[0];
  const [ruleId, setRuleId] = useState<string>(preferredRule?.id || "");
  const rule = rules.find((r) => r.id === ruleId) || preferredRule;
  if (!rules.length) {
    return <Card className="p-12 text-center text-sm text-muted-foreground">Create a routing rule first to configure prefills.</Card>;
  }
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Select rule to set university values</Label>
          <Select value={rule?.id} onValueChange={setRuleId}>
            <SelectTrigger className="h-9 w-[360px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {rules.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} · {(r.university_ids || []).length ? `${(r.university_ids || []).length} universities selected` : "needs universities"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">Runs at priority {rule?.priority}</Badge>
          <Badge variant="outline" className={rule?.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : ""}>
            {rule?.is_active ? "Active" : "Paused"}
          </Badge>
        </div>
      </Card>
      {rule && !(rule.university_ids || []).length && (
        <Card className="p-5 border-orange-500/20 bg-orange-500/5">
          <div className="font-semibold">This rule has no universities yet.</div>
          <p className="text-sm text-muted-foreground mt-1">Open the Rules tab, click “Edit Rule”, and tick the universities that should receive matching leads. After that, this value setup screen will show those universities here.</p>
        </Card>
      )}
      {rule && <PrefillEditor rule={rule} unis={unis} onSaved={onSaved} />}
    </div>
  );
}

function PrefillEditor({ rule, unis, onSaved }: { rule: Rule; unis: Uni[]; onSaved: () => void }) {
  const targets = unis.filter((u) => rule.university_ids.includes(u.id));
  const opts = useRuleOptions();
  const courseLabels = useMemo(() => new Map(opts.courses.map((c) => [c.value, c.label])), [opts.courses]);
  const scenarios = useMemo(() => buildScenarios(rule, courseLabels), [rule, courseLabels]);

  const [prefills, setPrefills] = useState<Rule["prefills"]>(rule.prefills || {});
  useEffect(() => { setPrefills(rule.prefills || {}); }, [rule.id]);
  const [saving, setSaving] = useState(false);
  const [activeUni, setActiveUni] = useState(targets[0]?.id || "");
  const [activeScenario, setActiveScenario] = useState("*");

  useEffect(() => {
    if (!targets.find((t) => t.id === activeUni)) setActiveUni(targets[0]?.id || "");
  }, [targets, activeUni]);

  const uni = targets.find((u) => u.id === activeUni) || targets[0];
  const uniFields = uni ? parseUniversityFields(uni) : [];
  const currentBlock = uni ? (prefills[uni.id]?.[activeScenario] || {}) : {};
  const customKeys = Object.keys(currentBlock).filter((k) => !uniFields.some((f) => f.key === k));
  const groups: Scenario["group"][] = ["Fallback", "Course", "Campaign", "Source", "City"];

  const setCell = (uniId: string, scenario: string, field: string, val: any) => {
    setPrefills((p) => {
      const next = { ...p };
      next[uniId] = { ...(next[uniId] || {}) };
      next[uniId][scenario] = { ...(next[uniId][scenario] || {}) };
      const empty = val == null || val === "" ||
        (typeof val === "object" && (val.mode === "default" ||
          (val.mode === "static" && !val.value) ||
          (val.mode === "lead" && !val.leadField)));
      if (empty) delete next[uniId][scenario][field];
      else next[uniId][scenario][field] = val;
      if (!Object.keys(next[uniId][scenario]).length) delete next[uniId][scenario];
      return next;
    });
  };
  const addCustomField = (uniId: string, scenario: string) => {
    const name = prompt("Custom field key (e.g. specialization, campus, branch):");
    if (!name) return;
    setCell(uniId, scenario, name.trim(), { mode: "static", value: "" });
  };
  const setManyCells = (uniId: string, scenario: string, values: Record<string, PrefillCfg>) => {
    Object.entries(values).forEach(([field, cfg]) => setCell(uniId, scenario, field, cfg));
  };
  const applyQuickPreset = (preset: "full_name" | "first_name" | "contact" | "course") => {
    const updates: Record<string, PrefillCfg> = {};
    uniFields.forEach((f) => {
      const k = f.key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (preset === "full_name" && (k === "name" || k === "fullname" || k.includes("studentname") || k.includes("leadname"))) {
        updates[f.key] = { mode: "lead", leadField: "name", transform: "full" };
      }
      if (preset === "first_name" && (k.includes("firstname") || k === "fname" || k === "name")) {
        updates[f.key] = { mode: "lead", leadField: "name", transform: "first" };
      }
      if (preset === "first_name" && (k.includes("lastname") || k === "lname")) {
        updates[f.key] = { mode: "lead", leadField: "name", transform: "last" };
      }
      if (preset === "contact" && (k.includes("mobile") || k.includes("phone") || k.includes("contact"))) {
        updates[f.key] = { mode: "lead", leadField: "mobile", transform: "digits" };
      }
      if (preset === "contact" && k.includes("email")) updates[f.key] = { mode: "lead", leadField: "email", transform: "lower" };
      if (preset === "course" && (k.includes("course") || k.includes("program") || k.includes("branch"))) {
        updates[f.key] = { mode: "lead", leadField: "course", transform: "full" };
      }
    });
    if (!Object.keys(updates).length) return toast.info("No matching field found for this preset.");
    setManyCells(uni.id, activeScenario, updates);
    toast.success("Preset applied. Review and save.");
  };
  const copyFallbackToScenario = () => {
    if (activeScenario === "*") return toast.info("You are already editing the fallback setup.");
    const fallback = prefills[uni.id]?.["*"] || {};
    if (!Object.keys(fallback).length) return toast.info("Fallback has no saved values to copy.");
    setPrefills((p) => ({
      ...p,
      [uni.id]: { ...(p[uni.id] || {}), [activeScenario]: { ...fallback, ...(p[uni.id]?.[activeScenario] || {}) } },
    }));
    toast.success("Fallback copied into this scenario.");
  };
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("lp_automation_rules" as any).update({ prefills } as any).eq("id", rule.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Prefills saved");
    onSaved();
  };

  if (targets.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Add target universities to this rule first.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        <Card className="p-0 h-fit sticky top-0 overflow-hidden">
          <div className="px-3 py-3 bg-muted/40">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Step A · Choose University</div>
            <div className="text-sm font-medium mt-1">Every university can receive different values.</div>
          </div>
          <div className="divide-y max-h-[60vh] overflow-y-auto">
            {targets.map((u) => {
              const filled = Object.values(prefills[u.id] || {}).reduce((n, blk) => n + Object.keys(blk).length, 0);
              return (
                <button
                  key={u.id}
                  onClick={() => setActiveUni(u.id)}
                  className={`w-full text-left p-2.5 text-sm hover:bg-muted/40 ${activeUni === u.id ? "bg-orange-500/10 border-l-2 border-l-orange-500" : ""}`}
                >
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="flex-1 truncate">{u.name}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-2">
                    <span>{u.api_type}</span>
                    {filled > 0 && <span className="text-emerald-600">{filled} values set</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="space-y-3">
          <Card className="p-4 border-orange-500/20 bg-orange-500/5">
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-orange-500 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Layman flow</div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  First set <b>Normal fallback</b>. Then add special cases only where needed - for example B.Tech sends “Program=BTECH”, MBA sends “Program=MBA”, or one university receives first name while another receives full name.
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Step B · When should these values apply?
            </div>
            <div className="text-xs text-muted-foreground mb-3">Start with fallback. Course / campaign / source / city options override fallback only for those leads.</div>
            <div className="space-y-2">
              {groups.map((g) => {
                const items = scenarios.filter((s) => s.group === g);
                if (!items.length) return null;
                return (
                  <div key={g} className="flex items-start gap-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold w-20 pt-1.5">{g}</div>
                    <div className="flex flex-wrap gap-1.5 flex-1">
                      {items.map((s) => {
                        const filled = Object.keys(prefills[uni.id]?.[s.key] || {}).length;
                        const active = activeScenario === s.key;
                        return (
                          <button
                            key={s.key}
                            onClick={() => setActiveScenario(s.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                              active ? "bg-orange-500 text-white border-orange-500" : "bg-background hover:bg-muted border-border"
                            }`}
                          >
                            {s.label}
                            {filled > 0 && (
                              <span className={`ml-1.5 px-1.5 rounded-full text-[10px] ${active ? "bg-white/20" : "bg-emerald-500/15 text-emerald-600"}`}>
                                {filled}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {scenarios.length === 1 && (
                <div className="text-xs text-muted-foreground italic pt-1">
                  Only fallback available. Add courses / cities / sources / CTAs to this rule to unlock more specific scenarios.
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b flex-wrap">
              <Building2 className="w-4 h-4 text-blue-600" />
              <div className="font-semibold">{uni.name}</div>
              <Badge variant="outline" className="text-xs">{uni.api_type}</Badge>
              <span className="text-xs text-muted-foreground lg:ml-auto">Editing: <b className="text-foreground">{scenarios.find((s) => s.key === activeScenario)?.label || activeScenario}</b></span>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 mb-4">
              <div className="text-sm font-semibold mb-2">Step C · Quick setup buttons</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => applyQuickPreset("full_name")}>Send full name</Button>
                <Button size="sm" variant="outline" onClick={() => applyQuickPreset("first_name")}>Split first / last name</Button>
                <Button size="sm" variant="outline" onClick={() => applyQuickPreset("contact")}>Map mobile + email</Button>
                <Button size="sm" variant="outline" onClick={() => applyQuickPreset("course")}>Map course / program</Button>
                <Button size="sm" variant="ghost" onClick={copyFallbackToScenario}>Copy fallback here</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Use these first, then adjust individual rows only where a university needs something different.</p>
            </div>

            <div className="grid grid-cols-[170px_150px_1fr_28px] gap-2 px-2 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <div>University field</div>
              <div>Send what?</div>
              <div>Value source</div>
              <div />
            </div>

            {uniFields.length === 0 ? (
              <div className="text-sm text-muted-foreground italic py-4 text-center">
                This university has no fields configured yet - open its config in Lead Push → Universities first.
              </div>
            ) : (
              <div className="space-y-2.5">
                {uniFields.map((f) => (
                  <FieldMappingRow
                    key={f.key}
                    field={f}
                    cfg={currentBlock[f.key]}
                    onChange={(v) => setCell(uni.id, activeScenario, f.key, v)}
                  />
                ))}
              </div>
            )}

            {customKeys.length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Custom fields</div>
                <div className="space-y-2.5">
                  {customKeys.map((k) => (
                    <FieldMappingRow
                      key={k}
                      field={{ key: k, label: k, required: false }}
                      cfg={currentBlock[k]}
                      onChange={(v) => setCell(uni.id, activeScenario, k, v)}
                      custom
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-between">
              <Button size="sm" variant="ghost" onClick={() => addCustomField(uni.id, activeScenario)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add custom field
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button onClick={save} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
          {saving ? "Saving…" : "Save All Prefills"}
        </Button>
      </div>
    </div>
  );
}



function LiveTester({ rules, unis, recentLeads, selectedLead }: { rules: Rule[]; unis: Uni[]; recentLeads: any[]; selectedLead?: any | null }) {
  const [lead, setLead] = useState({ name: "Test Lead", email: "test@dekho.com", phone: "9876543210", city: "Delhi", state: "Delhi", source: "chatbot", interested_course_slug: "btech", cta: "" });
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const loadFrom = useCallback((l: any) => setLead({
    name: l.name || "", email: l.email || "", phone: l.phone || "", city: l.city || "", state: l.state || "",
    source: l.source || "", interested_course_slug: l.interested_course_slug || l.initial_query || "", cta: l.cta || "",
  }), []);

  useEffect(() => {
    if (selectedLead) loadFrom(selectedLead);
  }, [selectedLead, loadFrom]);

  const run = useCallback(async (dryRun = true) => {
    setBusy(true); setResult(null);
    const { data, error } = await supabase.functions.invoke("lp-dispatch-lead", { body: { lead, dry_run: dryRun } });
    setBusy(false);
    if (error) return toast.error(error.message);
    setResult(data);
    if (!dryRun) toast.success(`Dispatched to ${data?.dispatched || 0} universities`);
  }, [lead]);

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Card className="p-5 space-y-3">
        <div className="flex items-start gap-2">
          <Play className="w-4 h-4 text-orange-500 mt-0.5" />
          <div>
            <h3 className="font-semibold">Test before real push</h3>
            <p className="text-xs text-muted-foreground mt-1">Preview shows which universities will receive the lead and what field values will be changed. It does not send anything.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["name", "phone", "city", "state", "source", "interested_course_slug", "cta", "email"] as const).map((k) => (
            <div key={k}>
              <Label className="text-xs capitalize">{k.replace(/_/g, " ")}</Label>
              <Input value={(lead as any)[k] || ""} onChange={(e) => setLead((p) => ({ ...p, [k]: e.target.value }))} className="h-9" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={() => run(true)} disabled={busy} className="bg-orange-500 hover:bg-orange-600 text-white flex-1">
            <Target className="w-4 h-4 mr-1.5" /> {busy ? "Checking…" : "Safe Preview"}
          </Button>
          <Button onClick={() => confirm("This will really push the lead to matched universities. Continue?") && run(false)} disabled={busy} variant="outline">
            <Rocket className="w-4 h-4 mr-1.5" /> Real Push
          </Button>
        </div>

        {recentLeads.length > 0 && (
          <>
            <Separator />
            <div>
              <Label className="text-xs">Or pick an existing lead from database</Label>
              <Select onValueChange={(v) => { const l = recentLeads.find((x) => x.id === v); if (l) loadFrom(l); }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pick a recent lead…" /></SelectTrigger>
                <SelectContent>
                  {recentLeads.slice(0, 25).map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name || l.phone || l.id.slice(0, 8)} · {l.city || "-"} · {l.interested_course_slug || l.cta || ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-orange-500" /><h3 className="font-semibold">Plain result</h3></div>
        {!result ? (
          <div className="text-sm text-muted-foreground italic">Run Safe Preview to see the exact routing and value changes before pushing.</div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30" variant="outline">{result.dispatched} matched</Badge>
              {result.reason && <span className="text-xs text-muted-foreground">{result.reason}</span>}
            </div>
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
              {(result.results || []).map((row: any, i: number) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg border bg-muted/30">
                  <ChevronRight className="w-4 h-4 mt-0.5 text-orange-500" />
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{row.university}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.rule && <>Matched rule: <span className="font-mono">{row.rule}</span> · </>}
                      {row.prefill_keys?.length > 0 && <>Changed fields: {row.prefill_keys.join(", ")} · </>}
                      {row.status && <span className={`px-1.5 rounded ${STATUS_COLORS[row.status] || ""}`}>{row.status}</span>}
                      {row.http && <> · HTTP {row.http}</>}
                    </div>
                    {row.overrides && Object.keys(row.overrides).length > 0 && (
                      <div className="mt-2 grid sm:grid-cols-2 gap-1.5">
                        {Object.entries(row.overrides).map(([k, v]) => (
                          <div key={k} className="text-[11px] rounded border bg-background px-2 py-1">
                            <span className="text-muted-foreground">{k}:</span> <span className="font-medium">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!result.results || result.results.length === 0) && (
                <div className="text-sm text-muted-foreground italic">No universities matched. Try adjusting your rules or lead fields.</div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function LogsTable({ logs, unis }: { logs: any[]; unis: Map<string, Uni> }) {
  if (!logs.length) return <Card className="p-8 text-center text-sm text-muted-foreground">No dispatch logs yet.</Card>;
  return (
    <Card className="overflow-hidden">
      <div className="divide-y">
        {logs.map((l) => (
          <div key={l.id} className="grid grid-cols-12 items-center gap-3 px-4 py-2.5 hover:bg-muted/30 text-sm">
            <div className="col-span-2 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</div>
            <div className="col-span-3 font-medium truncate">{unis.get(l.university_id)?.name || l.university_id?.slice(0, 8)}</div>
            <div className="col-span-2">
              <Badge variant="outline" className={STATUS_COLORS[l.status] || ""}>
                {l.status === "Success" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {l.status === "Fail" && <XCircle className="w-3 h-3 mr-1" />}
                {l.status === "Duplicate" && <AlertCircle className="w-3 h-3 mr-1" />}
                {l.status === "RateLimited" && <Clock className="w-3 h-3 mr-1" />}
                {l.status}
              </Badge>
            </div>
            <div className="col-span-1 text-xs text-muted-foreground">HTTP {l.http_status || "-"}</div>
            <div className="col-span-4 text-xs text-muted-foreground truncate">{l.error || l.response_body?.slice(0, 120) || ""}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LeadsTable({ leads, onTest }: { leads: any[]; onTest: (l: any) => void }) {
  if (!leads.length) return <Card className="p-8 text-center text-sm text-muted-foreground">No leads found.</Card>;
  return (
    <Card className="overflow-hidden">
      <div className="divide-y">
        {leads.map((l) => (
          <div key={l.id} className="grid grid-cols-12 items-center gap-3 px-4 py-2.5 hover:bg-muted/30 text-sm">
            <div className="col-span-3 font-medium truncate">{l.name || "-"}</div>
            <div className="col-span-2 text-xs">{l.phone || "-"}</div>
            <div className="col-span-2 text-xs">{l.city}{l.state ? `, ${l.state}` : ""}</div>
            <div className="col-span-2 text-xs"><Badge variant="outline">{l.interested_course_slug || l.cta || l.source || "-"}</Badge></div>
            <div className="col-span-2 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</div>
            <div className="col-span-1 text-right">
              <Button size="sm" variant="ghost" onClick={() => onTest(l)} className="h-7"><Play className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

type PrefillCfg = { mode: "default" | "lead" | "static"; leadField?: string; transform?: string; value?: string };
const LEAD_FIELDS: Opt[] = [
  { value: "name", label: "Lead name" },
  { value: "email", label: "Email" },
  { value: "mobile", label: "Mobile / Phone" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "course", label: "Course" },
  { value: "leadSource", label: "Source" },
  { value: "leadCampaign", label: "Campaign / CTA" },
  { value: "specialization", label: "Specialization" },
  { value: "address", label: "Address" },
];
const TRANSFORMS: Opt[] = [
  { value: "full", label: "Send full value" },
  { value: "first", label: "Send first name only" },
  { value: "last", label: "Send last name only" },
  { value: "initials", label: "Send initials" },
  { value: "lower", label: "Make lowercase" },
  { value: "upper", label: "Make uppercase" },
  { value: "digits", label: "Numbers only" },
];

function normalizeCfg(cfg: any): PrefillCfg {
  if (cfg == null) return { mode: "default" };
  if (typeof cfg === "string") return { mode: "static", value: cfg };
  if (typeof cfg === "object" && cfg.mode) return cfg as PrefillCfg;
  return { mode: "default" };
}

function FieldMappingRow({
  field, cfg, onChange, custom = false,
}: {
  field: { key: string; label: string; required: boolean; sourceType?: string; sourceKey?: string; staticValue?: string };
  cfg: any;
  onChange: (v: PrefillCfg | null) => void;
  custom?: boolean;
}) {
  const c = normalizeCfg(cfg);
  const autoHint = field.sourceType === "lead_data"
    ? `default → lead.${field.sourceKey || field.key}`
    : field.sourceType === "static"
      ? `default → "${field.staticValue ?? ""}"`
      : field.sourceType
        ? `default → ${field.sourceType}`
        : "no default";
  return (
    <div className="grid grid-cols-[170px_150px_1fr_28px] items-start gap-2 p-2 rounded-lg border bg-muted/20">
      <div className="text-xs pt-1.5">
        <div className="font-medium">{field.label}</div>
        {!custom && <div className="text-[10px] text-muted-foreground truncate">{autoHint}</div>}
        {field.required && <Badge variant="outline" className="mt-0.5 text-[9px] bg-rose-500/10 text-rose-600 border-rose-500/30">required</Badge>}
        {custom && <Badge variant="outline" className="mt-0.5 text-[9px]">custom</Badge>}
      </div>
      <Select value={c.mode} onValueChange={(m: any) => onChange({ ...c, mode: m })}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Normal setup</SelectItem>
          <SelectItem value="lead">From lead data</SelectItem>
          <SelectItem value="static">Fixed value</SelectItem>
        </SelectContent>
      </Select>
      <div className="space-y-1">
        {c.mode === "default" && (
          <div className="text-xs text-muted-foreground italic pt-1.5">No change - use the university’s saved mapping.</div>
        )}
        {c.mode === "static" && (
          <Input
            value={c.value || ""}
            onChange={(e) => onChange({ mode: "static", value: e.target.value })}
            placeholder="Type exact value to send every time"
            className="h-8 text-sm"
          />
        )}
        {c.mode === "lead" && (
          <div className="grid grid-cols-2 gap-1.5">
            <Select value={c.leadField || ""} onValueChange={(v) => onChange({ ...c, mode: "lead", leadField: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Lead field…" /></SelectTrigger>
              <SelectContent>
                {LEAD_FIELDS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={c.transform || "full"} onValueChange={(v) => onChange({ ...c, mode: "lead", transform: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRANSFORMS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <Button size="icon" variant="ghost" onClick={() => onChange(null)} title="Reset to default">
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

