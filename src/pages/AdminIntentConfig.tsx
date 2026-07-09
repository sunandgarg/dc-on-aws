import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Webhook, Scale } from "lucide-react";

type Weight = { event_type: string; label: string; weight: number; is_active: boolean; category: string | null };
type Hook = {
  id: string; name: string; college_slug: string | null; university_slug: string | null;
  webhook_url: string; secret: string | null; threshold_score: number; is_active: boolean;
};

export default function AdminIntentConfig() {
  const [weights, setWeights] = useState<Weight[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [w, h] = await Promise.all([
      supabase.from("intent_event_weights").select("*").order("weight", { ascending: false }),
      supabase.from("intent_university_webhooks").select("*").order("name"),
    ]);
    setWeights(((w.data as any[]) || []) as Weight[]);
    setHooks(((h.data as any[]) || []) as Hook[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveWeight = async (row: Weight) => {
    const { error } = await supabase.from("intent_event_weights")
      .update({ weight: row.weight, is_active: row.is_active, label: row.label, category: row.category })
      .eq("event_type", row.event_type);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
  };
  const addWeight = async () => {
    const event_type = prompt("Event type key (e.g. fee_viewed)")?.trim();
    if (!event_type) return;
    const label = prompt("Label", event_type) || event_type;
    const { error } = await supabase.from("intent_event_weights").insert({ event_type, label, weight: 5, is_active: true } as any);
    if (error) return toast({ title: "Insert failed", description: error.message, variant: "destructive" });
    load();
  };
  const delWeight = async (event_type: string) => {
    if (!confirm("Delete weight?")) return;
    await supabase.from("intent_event_weights").delete().eq("event_type", event_type);
    load();
  };

  const saveHook = async (row: Hook) => {
    const { error } = await supabase.from("intent_university_webhooks")
      .update({ name: row.name, college_slug: row.college_slug, university_slug: row.university_slug,
        webhook_url: row.webhook_url, secret: row.secret, threshold_score: row.threshold_score, is_active: row.is_active })
      .eq("id", row.id);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
  };
  const addHook = async () => {
    const { error } = await supabase.from("intent_university_webhooks").insert({
      name: "New Partner", webhook_url: "https://example.com/webhook", threshold_score: 80, is_active: false,
    } as any);
    if (error) return toast({ title: "Insert failed", description: error.message, variant: "destructive" });
    load();
  };
  const delHook = async (id: string) => {
    if (!confirm("Delete webhook?")) return;
    await supabase.from("intent_university_webhooks").delete().eq("id", id);
    load();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Intent Intelligence Config</h1>
        <p className="text-muted-foreground">Tune event scoring weights and partner webhook destinations.</p>
      </div>

      <Tabs defaultValue="weights">
        <TabsList>
          <TabsTrigger value="weights"><Scale className="w-4 h-4 mr-2" />Event Weights</TabsTrigger>
          <TabsTrigger value="hooks"><Webhook className="w-4 h-4 mr-2" />University Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="weights" className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Cold ≤30 · Warm ≤70 · Hot ≤120 · Admission Ready 121+</p>
            <Button size="sm" onClick={addWeight}><Plus className="w-4 h-4 mr-1" />Add Event</Button>
          </div>
          {loading ? <p>Loading...</p> : weights.map((w, i) => (
            <Card key={w.event_type} className="p-4 flex gap-3 items-center flex-wrap">
              <Badge variant="outline" className="font-mono">{w.event_type}</Badge>
              <Input className="w-24" type="number" value={w.weight}
                onChange={e => { const v = [...weights]; v[i].weight = Number(e.target.value); setWeights(v); }} />
              <Input className="flex-1 min-w-[200px]" placeholder="Label" value={w.label || ""}
                onChange={e => { const v = [...weights]; v[i].label = e.target.value; setWeights(v); }} />
              <Input className="w-32" placeholder="Category" value={w.category || ""}
                onChange={e => { const v = [...weights]; v[i].category = e.target.value; setWeights(v); }} />
              <div className="flex items-center gap-2">
                <Switch checked={w.is_active} onCheckedChange={c => { const v = [...weights]; v[i].is_active = c; setWeights(v); }} />
                <span className="text-xs">Active</span>
              </div>
              <Button size="sm" onClick={() => saveWeight(w)}><Save className="w-4 h-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => delWeight(w.event_type)}><Trash2 className="w-4 h-4" /></Button>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="hooks" className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Alerts POST to each webhook when score ≥ threshold (or matching event type fires).</p>
            <Button size="sm" onClick={addHook}><Plus className="w-4 h-4 mr-1" />Add Webhook</Button>
          </div>
          {loading ? <p>Loading...</p> : hooks.map((h, i) => (
            <Card key={h.id} className="p-4 space-y-2">
              <div className="flex gap-2 flex-wrap items-center">
                <Input className="w-48" placeholder="Partner name" value={h.name}
                  onChange={e => { const v = [...hooks]; v[i].name = e.target.value; setHooks(v); }} />
                <Input className="flex-1 min-w-[300px]" placeholder="https://crm.uni.edu/webhook" value={h.webhook_url}
                  onChange={e => { const v = [...hooks]; v[i].webhook_url = e.target.value; setHooks(v); }} />
                <Input className="w-24" type="number" placeholder="Threshold" value={h.threshold_score}
                  onChange={e => { const v = [...hooks]; v[i].threshold_score = Number(e.target.value); setHooks(v); }} />
                <div className="flex items-center gap-2">
                  <Switch checked={h.is_active} onCheckedChange={c => { const v = [...hooks]; v[i].is_active = c; setHooks(v); }} />
                  <span className="text-xs">Active</span>
                </div>
                <Button size="sm" onClick={() => saveHook(h)}><Save className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => delHook(h.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Input className="flex-1 min-w-[200px]" placeholder="College slug filter (optional)" value={h.college_slug || ""}
                  onChange={e => { const v = [...hooks]; v[i].college_slug = e.target.value; setHooks(v); }} />
                <Input className="flex-1 min-w-[200px]" placeholder="University slug filter (optional)" value={h.university_slug || ""}
                  onChange={e => { const v = [...hooks]; v[i].university_slug = e.target.value; setHooks(v); }} />
                <Input className="flex-1 min-w-[200px]" placeholder="Secret (X-Webhook-Secret header)" value={h.secret || ""}
                  onChange={e => { const v = [...hooks]; v[i].secret = e.target.value; setHooks(v); }} />
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
