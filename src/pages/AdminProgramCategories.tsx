import { AdminLayout } from "@/components/AdminLayout";
import { SimpleTableAdmin } from "@/components/admin/SimpleTableAdmin";

import { CSVTools } from "@/components/CSVTools";
/**
 * Premium Programs → Categories (chips shown above the Trending Programs grid).
 * Admins control name, emoji/icon, order, and active state.
 * Each `promoted_programs` row links to one via `category_slug` so the front-end
 * filter aligns cards under their tapped chip.
 */
export default function AdminProgramCategories() {
  return (
    <AdminLayout title="Popular Program Category">
      <div className="mb-4">
        <CSVTools table="program_categories" filename="program_categories.csv" columns="*" upsertKey="slug" />
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        These chips appear above the Premium Programs section on the homepage. Tapping a chip filters cards by category.
        Use either an emoji or upload an icon image.
      </p>
      <SimpleTableAdmin
        table="program_categories"
        titleKey="name"
        subtitleKey="slug"
        orderBy={{ column: "display_order" }}
        defaultValues={{ slug: "", name: "", icon_emoji: "🎓", icon_url: "", display_order: 0, is_active: true }}
        ioColumns={["slug","name","icon_emoji","icon_url","display_order","is_active"]}
        ioTypeHints={{ display_order: "number", is_active: "boolean" }}
        fields={[
          { key: "name", label: "Name", required: true, placeholder: "Agentic AI" },
          { key: "slug", label: "Slug", required: true, placeholder: "agentic-ai" },
          { key: "icon_emoji", label: "Icon emoji (fallback)", placeholder: "🤖" },
          { key: "icon_url", label: "Category Image (overrides emoji)", type: "image", placeholder: "Upload or paste URL" },
          { key: "display_order", label: "Display Order", type: "number" },
        ]}
      />
    </AdminLayout>
  );
}
