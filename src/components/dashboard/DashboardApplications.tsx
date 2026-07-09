import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, ExternalLink, Loader2, Inbox } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  in_progress: "bg-purple-100 text-purple-700",
  enrolled: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export function DashboardApplications() {
  const { user } = useAuth();
  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("college_applications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (apps.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-bold text-foreground mb-1">No applications yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Browse colleges and tap "Apply Now" to get started.</p>
          <Button asChild className="rounded-xl"><Link to="/colleges">Explore Colleges</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-foreground">My Applications ({apps.length})</h2>
      {apps.map((a: any) => (
        <Card key={a.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <Link to={`/colleges/${a.college_slug}`} className="font-bold text-foreground hover:text-primary inline-flex items-center gap-1 truncate">
                    {a.college_name || a.college_slug}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Badge className={`text-[10px] ${STATUS_COLORS[a.status] || ""}`}>{a.status.replace("_", " ")}</Badge>
                </div>
                {a.course_interest && <div className="text-sm text-muted-foreground">📚 {a.course_interest}</div>}
                <div className="text-[11px] text-muted-foreground mt-1">
                  Applied on {new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
