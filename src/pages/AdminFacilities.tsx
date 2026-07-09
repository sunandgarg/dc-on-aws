import { AdminLayout } from "@/components/AdminLayout";
import { SimpleTableAdmin } from "@/components/admin/SimpleTableAdmin";

import { CSVTools } from "@/components/CSVTools";
export default function AdminFacilities() {
  return (
    <AdminLayout title="Facilities Library">
      <div className="mb-4">
        <CSVTools table="facilities_library" filename="facilities_library.csv" columns="*" upsertKey="slug" />
      </div>

      <p className="text-sm text-muted-foreground mb-4">Preset library of facilities. Edit colleges to attach these.</p>
      <SimpleTableAdmin
        table="facilities_library"
        titleKey="name"
        subtitleKey="description"
        defaultValues={{ name: "", icon_emoji: "🏫", description: "" }}
        ioColumns={["name","icon_emoji","description"]}
        fields={[
          { key: "name", label: "Facility Name", required: true },
          { key: "icon_emoji", label: "Icon Emoji", placeholder: "🏫" },
          { key: "description", label: "Description", type: "textarea" },
        ]}
      />
    </AdminLayout>
  );
}
