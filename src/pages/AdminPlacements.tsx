import { AdminLayout } from "@/components/AdminLayout";
import { SimpleTableAdmin } from "@/components/admin/SimpleTableAdmin";

import { CSVTools } from "@/components/CSVTools";
export default function AdminPlacements() {
  return (
    <AdminLayout title="Placement Records">
      <div className="mb-4">
        <CSVTools table="placement_records" filename="placement_records.csv" columns="*" upsertKey="id" />
      </div>

      <p className="text-sm text-muted-foreground mb-4">Add company-wise placement records linked to colleges and (optionally) courses.</p>
      <SimpleTableAdmin
        table="placement_records"
        titleKey="company_name"
        subtitleKey="college_slug"
        defaultValues={{ college_slug: "", course_slug: "", company_name: "", package_lpa: 0, year: "", role: "", hires_count: 0 }}
        ioColumns={["college_slug","course_slug","company_name","package_lpa","year","role","hires_count"]}
        ioTypeHints={{ package_lpa: "number", hires_count: "number" }}
        fields={[
          { key: "college_slug", label: "College Slug", required: true },
          { key: "course_slug", label: "Course Slug (optional)" },
          { key: "company_name", label: "Company Name", required: true },
          { key: "package_lpa", label: "Package (LPA)", type: "number" },
          { key: "year", label: "Year", placeholder: "2024" },
          { key: "role", label: "Role" },
          { key: "hires_count", label: "Hires Count", type: "number" },
        ]}
      />
    </AdminLayout>
  );
}
