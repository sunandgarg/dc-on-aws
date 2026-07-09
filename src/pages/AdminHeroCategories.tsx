import { AdminLayout } from "@/components/AdminLayout";
import { SimpleTableAdmin } from "@/components/admin/SimpleTableAdmin";

import { CSVTools } from "@/components/CSVTools";
/**
 * Hero quick-link tiles shown below the homepage search bar.
 * Admins can swap the icon/logo image, label, link, and ordering for:
 * College, Course, Exam, Application Form, Review, News.
 */
export default function AdminHeroCategories() {
  return (
    <AdminLayout title="Hero Bar Categories">
      <div className="mb-4">
        <CSVTools table="hero_categories" filename="hero_categories.csv" columns="*" upsertKey="slug" />
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Manage the six tiles shown right below the homepage search bar. Upload a new icon/logo image, change the label, link, or display order.
      </p>
      <SimpleTableAdmin
        table="hero_categories"
        titleKey="label"
        subtitleKey="key"
        orderBy={{ column: "display_order" }}
        defaultValues={{ key: "", label: "", image_url: "", href: "/", tint: "bg-rose-50 hover:bg-rose-100/70 border-rose-100", display_order: 0, is_active: true }}
        ioColumns={["key", "label", "image_url", "href", "tint", "display_order", "is_active"]}
        ioTypeHints={{ display_order: "number", is_active: "boolean" }}
        fields={[
          { key: "label", label: "Label", required: true, placeholder: "13,004+ Colleges" },
          { key: "key", label: "Key (unique)", required: true, placeholder: "college" },
          { key: "image_url", label: "Logo / Icon image", type: "image", placeholder: "Upload or paste URL" },
          { key: "href", label: "Link / Route", required: true, placeholder: "/colleges" },
          { key: "tint", label: "Tailwind tint classes", placeholder: "bg-rose-50 hover:bg-rose-100/70 border-rose-100" },
          { key: "display_order", label: "Display Order", type: "number" },
        ]}
      />
    </AdminLayout>
  );
}
