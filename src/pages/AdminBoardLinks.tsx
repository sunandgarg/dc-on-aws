import { AdminLayout } from "@/components/AdminLayout";
import { SimpleTableAdmin } from "@/components/admin/SimpleTableAdmin";

import { CSVTools } from "@/components/CSVTools";
export default function AdminBoardLinks() {
  return (
    <AdminLayout title="Board Quick Links">
      <div className="mb-4">
        <CSVTools table="study_board_links" filename="study_board_links.csv" columns="*" upsertKey="id" />
      </div>

      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-1">Board Quick Links</h1>
        <p className="text-sm text-muted-foreground mb-5">
          Manage the collegedekho-style resource rows shown on each Class × Board page
          (Date Sheet, Syllabus, PYQ, Sample Paper, Result, etc.).
        </p>
        <SimpleTableAdmin
          table="study_board_links"
          titleKey="title"
          subtitleKey="url"
          orderBy={{ column: "display_order", ascending: true }}
          defaultValues={{ is_active: true, display_order: 0, category: "general" }}
          ioColumns={["title","url","board_slug","class_num","category","display_order","is_active"]}
          ioTypeHints={{ class_num: "number", display_order: "number", is_active: "boolean" }}
          fields={[
            { key: "title", label: "Title", required: true, placeholder: "CBSE Class 12 Date Sheet 2026" },
            { key: "url", label: "URL", required: true, placeholder: "/news/tag/cbse-class-12-date-sheet" },
            { key: "board_slug", label: "Board Slug", required: true, placeholder: "cbse / icse / state-up ..." },
            { key: "class_num", label: "Class Number", type: "number", required: true, placeholder: "10 or 12" },
            { key: "category", label: "Section (syllabus / sample-papers / time-table / results / blog / general)", placeholder: "syllabus" },
            { key: "display_order", label: "Display Order", type: "number" },
            { key: "is_active", label: "Active", type: "boolean" },
          ]}
        />
      </div>
    </AdminLayout>
  );
}
