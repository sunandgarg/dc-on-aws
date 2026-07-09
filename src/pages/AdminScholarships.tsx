import { AdminLayout } from "@/components/AdminLayout";
import { AIGenerateDialog } from "@/components/admin/AIGenerateDialog";
import { SimpleTableAdmin } from "@/components/admin/SimpleTableAdmin";

import { CSVTools } from "@/components/CSVTools";
export default function AdminScholarships() {
  return (
    <AdminLayout title="Scholarships">
      <div className="mb-3"><AIGenerateDialog entityType="scholarships" table="scholarships" /></div>
      <div className="mb-4">
        <CSVTools table="scholarships" filename="scholarships.csv" columns="*" upsertKey="slug" />
      </div>

      <SimpleTableAdmin
        table="scholarships"
        titleKey="title"
        subtitleKey="provider"
        orderBy={{ column: "display_order", ascending: true }}
        previewBasePath="/scholarships"
        previewSlugKey="slug"
        defaultValues={{ is_live: true, is_active: true, display_order: 0, category: "General", level: "UG" }}
        ioBaseName="scholarship"
        ioColumns={["slug","title","provider","amount","deadline","eligibility","category","level","apply_url","image","description","page_summary","is_live","is_active","display_order","meta_title","meta_description"]}
        ioTypeHints={{ display_order: "number", is_live: "boolean", is_active: "boolean" }}
        fields={[
          { key: "title", label: "Title", required: true },
          { key: "author_id", label: "Author (byline)", type: "author" },
          { key: "slug", label: "Slug", required: true, placeholder: "kebab-case unique" },
          { key: "provider", label: "Provider" },
          { key: "amount", label: "Amount", placeholder: "₹50,000 / year" },
          { key: "deadline", label: "Deadline", placeholder: "31 Dec 2026" },
          { key: "eligibility", label: "Eligibility", type: "textarea" },
          { key: "category", label: "Category" },
          { key: "level", label: "Level", placeholder: "UG / PG / Diploma" },
          { key: "apply_url", label: "Apply URL" },
          { key: "image", label: "Cover image (upload or link)", type: "image" },
          { key: "page_summary", label: "Quick Summary - summarise the whole page (200–800 words, HTML allowed)", type: "textarea" },
          { key: "description", label: "Description (HTML)", type: "textarea" },
          { key: "is_live", label: "Live (show in homepage strip)", type: "boolean" },
          { key: "is_active", label: "Active", type: "boolean" },
          { key: "display_order", label: "Display order", type: "number" },
          { key: "meta_title", label: "Meta title" },
          { key: "meta_description", label: "Meta description", type: "textarea" },
        ]}
      />
    </AdminLayout>
  );
}
