import { AdminLayout } from "@/components/AdminLayout";
import { SimpleTableAdmin } from "@/components/admin/SimpleTableAdmin";

import { CSVTools } from "@/components/CSVTools";
export default function AdminContacts() {
  return (
    <AdminLayout title="College Contacts">
      <div className="mb-4">
        <CSVTools table="college_contacts" filename="college_contacts.csv" columns="*" upsertKey="id" />
      </div>

      <p className="text-sm text-muted-foreground mb-4">Contact details for each college (one record per college slug).</p>
      <SimpleTableAdmin
        table="college_contacts"
        titleKey="college_slug"
        subtitleKey="email"
        defaultValues={{ college_slug: "", address: "", phone: "", email: "", website: "", map_link: "", map_embed: "" }}
        ioColumns={["college_slug","phone","email","website","address","map_link","map_embed"]}
        fields={[
          { key: "college_slug", label: "College Slug", required: true },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "website", label: "Website" },
          { key: "address", label: "Address", type: "textarea" },
          { key: "map_link", label: "Google Maps Link (paste any maps.google.com URL)" },
          { key: "map_embed", label: "Google Maps Embed URL (optional)", type: "textarea" },
        ]}
      />
    </AdminLayout>
  );
}
