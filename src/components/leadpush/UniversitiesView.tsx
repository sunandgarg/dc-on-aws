import { memo, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Globe,
  Hash,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react";
import { UniversityApiPanel } from "@/components/universities/UniversityApiPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UniversityExportButton } from "./UniversityExport";
import { BulkImportExport, UniversityExportData } from "@/components/universities/UniversityImportExport";

interface UniversitiesViewProps {
  universities: any[];
  onAdd: () => void;
  onEdit: (uni: any) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onBulkImport?: (configs: UniversityExportData[]) => void;
}

export function UniversitiesView({ universities, onAdd, onEdit, onDelete, onRefresh, onBulkImport }: UniversitiesViewProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set());

  const apiUniversities = useMemo(() => universities.filter((uni) => uni.api_url?.trim()), [universities]);

  const filteredUniversities = useMemo(() => {
    if (!searchTerm.trim()) return apiUniversities;
    const term = searchTerm.toLowerCase();
    return apiUniversities.filter(
      (uni) => uni.name?.toLowerCase().includes(term) || uni.api_url?.toLowerCase().includes(term),
    );
  }, [apiUniversities, searchTerm]);

  const togglePanel = (id: string) => {
    setExpandedPanels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/admin/lead-push")}
        className="mb-4 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Lead Push
      </Button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Universities</h1>
          <p className="text-muted-foreground">
            Manage university API configurations ({apiUniversities.length} configured)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BulkImportExport universities={apiUniversities} onBulkImport={onBulkImport} />
          <Button onClick={onAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add University
          </Button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search universities..."
          className="pl-10"
        />
      </div>

      {filteredUniversities.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No universities found</p>
          <Button onClick={onAdd} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Your First University
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredUniversities.map((uni) => (
            <Card key={uni.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Globe className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{uni.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{uni.api_url}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-muted">
                        <Hash className="inline h-3 w-3 mr-1" />
                        {uni.college_id}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-muted">
                        <BookOpen className="inline h-3 w-3 mr-1" />
                        {uni.programs?.length || 0} programs
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-muted">
                        {uni.leads_per_minute || 5} leads/min
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <UniversityExportButton university={uni} variant="icon" />
                    <Button variant="ghost" size="sm" onClick={() => onEdit(uni)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(uni.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => togglePanel(uni.id)}>
                      {expandedPanels.has(uni.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {expandedPanels.has(uni.id) && <UniversityApiPanel universityId={uni.id} universityName={uni.name} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(UniversitiesView);
