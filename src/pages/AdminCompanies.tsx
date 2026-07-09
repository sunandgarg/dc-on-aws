import { AdminLayout } from "@/components/AdminLayout";
import { AIGenerateDialog } from "@/components/admin/AIGenerateDialog";
import { SimpleTableAdmin } from "@/components/admin/SimpleTableAdmin";

import { CSVTools } from "@/components/CSVTools";
export default function AdminCompanies() {
  return (
    <AdminLayout title="Companies">
      <div className="mb-3"><AIGenerateDialog entityType="companies" table="companies" upsertKey="name" /></div>
      <div className="mb-4">
        <CSVTools table="companies" filename="companies.csv" columns="*" upsertKey="slug" />
      </div>

      <p className="text-sm text-muted-foreground mb-4">Central library of companies - reused across colleges, courses, and exams for placements.</p>
      <SimpleTableAdmin
        table="companies"
        titleKey="name"
        subtitleKey="sector"
        defaultValues={{ name: "", logo: "", sector: "", website: "" }}
        ioColumns={["name","sector","logo","website"]}
        fields={[
          { key: "name", label: "Company Name", required: true },
          { key: "sector", label: "Sector", placeholder: "IT Services" },
          { key: "logo", label: "Logo URL" },
          { key: "website", label: "Website" },
        ]}
      />
    </AdminLayout>
  );
}
