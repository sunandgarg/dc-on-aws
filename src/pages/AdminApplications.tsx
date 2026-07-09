import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ExternalLink, Phone, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { CSVTools } from "@/components/CSVTools";
const STATUS = ["submitted", "contacted", "in_progress", "enrolled", "rejected"];

export default function AdminApplications() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("college_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = apps.filter((a: any) => {
    if (filter !== "all" && a.status !== filter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.name?.toLowerCase().includes(s) ||
      a.phone?.includes(s) ||
      a.email?.toLowerCase().includes(s) ||
      a.college_name?.toLowerCase().includes(s) ||
      a.college_slug?.toLowerCase().includes(s)
    );
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("college_applications").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["admin-applications"] });
  };

  return (
    <AdminLayout title="College Applications">
      <div className="mb-4">
        <CSVTools table="college_applications" filename="college_applications.csv" columns="*" upsertKey="id" />
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email, college..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="all">All Status</option>
          {STATUS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {["all", ...STATUS].map((s) => {
          const count = s === "all" ? apps.length : apps.filter((a: any) => a.status === s).length;
          return (
            <Card key={s} className={`cursor-pointer ${filter === s ? "ring-2 ring-primary" : ""}`} onClick={() => setFilter(s)}>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{count}</div>
                <div className="text-[11px] text-muted-foreground capitalize">{s.replace("_", " ")}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No applications yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a: any) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="font-bold text-foreground truncate">{a.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      <div className="flex flex-wrap gap-3">
                        <a href={`tel:${a.phone}`} className="flex items-center gap-1 hover:text-primary"><Phone className="w-3 h-3" /> {a.phone}</a>
                        {a.email && <a href={`mailto:${a.email}`} className="flex items-center gap-1 hover:text-primary"><Mail className="w-3 h-3" /> {a.email}</a>}
                        {(a.city || a.state) && <span>📍 {[a.city, a.state].filter(Boolean).join(", ")}</span>}
                      </div>
                      <div className="text-foreground font-medium mt-1">
                        🎓 <Link to={`/colleges/${a.college_slug}`} className="hover:text-primary inline-flex items-center gap-1">
                          {a.college_name || a.college_slug} <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                      {a.course_interest && <div>📚 {a.course_interest}</div>}
                      {a.message && <div className="text-xs italic mt-1">"{a.message}"</div>}
                    </div>
                  </div>
                  <div className="flex flex-row md:flex-col gap-2 shrink-0">
                    <select
                      value={a.status}
                      onChange={(e) => updateStatus(a.id, e.target.value)}
                      className="h-9 px-2 rounded-md border border-input bg-background text-xs"
                    >
                      {STATUS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                    </select>
                    <Button asChild variant="outline" size="sm" className="h-9">
                      <a href={`https://wa.me/91${a.phone}`} target="_blank" rel="noreferrer">WhatsApp</a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
