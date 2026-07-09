import { AdminLayout } from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BulkEditGrid, type BulkColumn } from "@/components/admin/BulkEditGrid";
import { GraduationCap, BookOpen, FileText, Newspaper, Award, Briefcase } from "lucide-react";

const collegeCols: BulkColumn[] = [
  { key: "name", label: "Name", width: 240 },
  { key: "slug", label: "Slug", width: 180 },
  { key: "short_name", label: "Short", width: 120 },
  { key: "category", label: "Category", type: "select", options: ["Engineering","Medical","Management","Law","Design","Science","Arts","Commerce"], width: 140 },
  { key: "type", label: "Type", type: "select", options: ["Government","Private","Deemed","Autonomous"], width: 130 },
  { key: "city", label: "City", width: 130 },
  { key: "state", label: "State", width: 130 },
  { key: "established", label: "Estd", type: "number", width: 90 },
  { key: "naac_grade", label: "NAAC", width: 90, defaultVisible: false },
  { key: "ranking", label: "Ranking", width: 130, defaultVisible: false },
  { key: "fees", label: "Fees", width: 130, defaultVisible: false },
  { key: "placement", label: "Placement", width: 130, defaultVisible: false },
  { key: "rating", label: "Rating", type: "number", width: 90 },
  { key: "priority", label: "Priority", type: "number", width: 90 },
  { key: "status", label: "Status", type: "select", options: ["Draft","Published"], width: 110 },
  { key: "is_active", label: "Active", type: "boolean", width: 70 },
];

const courseCols: BulkColumn[] = [
  { key: "name", label: "Name", width: 220 },
  { key: "slug", label: "Slug", width: 180 },
  { key: "full_name", label: "Full Name", width: 200, defaultVisible: false },
  { key: "category", label: "Category", width: 140 },
  { key: "level", label: "Level", type: "select", options: ["Undergraduate","Postgraduate","Diploma","Doctorate","Certificate"], width: 140 },
  { key: "duration", label: "Duration", width: 110 },
  { key: "mode", label: "Mode", type: "select", options: ["Full-Time","Part-Time","Online","Distance"], width: 110 },
  { key: "fee", label: "Fee", type: "number", width: 110 },
  { key: "low_fee", label: "Low Fee", type: "number", width: 110, defaultVisible: false },
  { key: "high_fee", label: "High Fee", type: "number", width: 110, defaultVisible: false },
  { key: "avg_salary", label: "Avg Salary", width: 130, defaultVisible: false },
  { key: "rating", label: "Rating", type: "number", width: 90 },
  { key: "priority", label: "Priority", type: "number", width: 90 },
  { key: "status", label: "Status", type: "select", options: ["Draft","Published"], width: 110 },
  { key: "is_active", label: "Active", type: "boolean", width: 70 },
];

const examCols: BulkColumn[] = [
  { key: "name", label: "Name", width: 200 },
  { key: "slug", label: "Slug", width: 180 },
  { key: "short_name", label: "Short", width: 110 },
  { key: "category", label: "Category", width: 140 },
  { key: "level", label: "Level", type: "select", options: ["National","State","University","International"], width: 130 },
  { key: "mode", label: "Mode", width: 130, defaultVisible: false },
  { key: "exam_date", label: "Exam Date", width: 140 },
  { key: "application_start_date", label: "App Start", width: 140, defaultVisible: false },
  { key: "application_end_date", label: "App End", width: 140, defaultVisible: false },
  { key: "result_date", label: "Result", width: 140, defaultVisible: false },
  { key: "frequency", label: "Frequency", width: 110, defaultVisible: false },
  { key: "is_top_exam", label: "Top", type: "boolean", width: 70 },
  { key: "priority", label: "Priority", type: "number", width: 90 },
  { key: "status", label: "Status", type: "select", options: ["Upcoming","Ongoing","Completed","Cancelled"], width: 120 },
  { key: "is_active", label: "Active", type: "boolean", width: 70 },
];

const articleCols: BulkColumn[] = [
  { key: "title", label: "Title", width: 280 },
  { key: "slug", label: "Slug", width: 200 },
  { key: "category", label: "Category", width: 150 },
  { key: "vertical", label: "Vertical", width: 130, defaultVisible: false },
  { key: "author", label: "Author", width: 140 },
  { key: "views", label: "Views", type: "number", width: 90 },
  { key: "status", label: "Status", type: "select", options: ["Draft","Published"], width: 120 },
  { key: "is_active", label: "Active", type: "boolean", width: 70 },
];

const scholarshipCols: BulkColumn[] = [
  { key: "title", label: "Title", width: 240 },
  { key: "slug", label: "Slug", width: 180 },
  { key: "provider", label: "Provider", width: 180 },
  { key: "amount", label: "Amount", width: 130 },
  { key: "deadline", label: "Deadline", width: 130 },
  { key: "category", label: "Category", width: 130 },
  { key: "level", label: "Level", width: 110 },
  { key: "display_order", label: "Order", type: "number", width: 80 },
  { key: "is_live", label: "Live", type: "boolean", width: 70 },
  { key: "is_active", label: "Active", type: "boolean", width: 70 },
];

const careerCols: BulkColumn[] = [
  { key: "name", label: "Name", width: 220 },
  { key: "slug", label: "Slug", width: 180 },
  { key: "domain", label: "Domain", width: 140 },
  { key: "avg_salary", label: "Avg Salary", width: 130 },
  { key: "growth", label: "Growth", width: 110 },
  { key: "experience_required", label: "Experience", width: 130, defaultVisible: false },
  { key: "display_order", label: "Order", type: "number", width: 80 },
  { key: "is_featured", label: "Featured", type: "boolean", width: 90 },
  { key: "status", label: "Status", type: "select", options: ["Draft","Published"], width: 110 },
  { key: "is_active", label: "Active", type: "boolean", width: 70 },
];

const TABS = [
  { value: "colleges", label: "Colleges", icon: GraduationCap, table: "colleges", cols: collegeCols, search: ["name","slug","short_name","city","state"] },
  { value: "courses", label: "Courses", icon: BookOpen, table: "courses", cols: courseCols, search: ["name","slug","full_name","category"] },
  { value: "exams", label: "Exams", icon: FileText, table: "exams", cols: examCols, search: ["name","slug","short_name","category"] },
  { value: "articles", label: "Articles", icon: Newspaper, table: "articles", cols: articleCols, search: ["title","slug","category","author"] },
  { value: "scholarships", label: "Scholarships", icon: Award, table: "scholarships", cols: scholarshipCols, search: ["title","slug","provider","category"] },
  { value: "careers", label: "Careers", icon: Briefcase, table: "career_profiles", cols: careerCols, search: ["name","slug","domain"] },
];

export default function AdminBulk() {
  return (
    <AdminLayout title="Bulk Inline Edit">
      <div className="mb-3 bg-primary/5 border border-primary/20 rounded-2xl p-3 text-sm">
        Edit any field inline across rows. Search to narrow, toggle columns, then <b>Save All</b> to persist in one batch.
      </div>
      <Tabs defaultValue="colleges">
        <TabsList className="mb-3">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              <t.icon className="w-3.5 h-3.5 mr-1" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <BulkEditGrid
              table={t.table}
              columns={t.cols}
              searchKeys={t.search}
              orderBy={{ column: "updated_at", ascending: false }}
            />
          </TabsContent>
        ))}
      </Tabs>
    </AdminLayout>
  );
}
