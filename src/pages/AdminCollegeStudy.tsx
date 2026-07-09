import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { SimpleTableAdmin } from "@/components/admin/SimpleTableAdmin";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SEO } from "@/components/SEO";

export default function AdminCollegeStudy() {
  const [tab, setTab] = useState("programs");

  return (
    <AdminLayout title="College Study Material">
      <SEO title="College Study Material - Admin" description="Manage BTech / BCA / MBA university study material" canonical="/admin/college-study" />
      <div className="container py-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">College Study Material</h1>
        <p className="text-sm text-muted-foreground mb-4">Programs → Universities → Semesters → Subjects → Resources</p>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto bg-muted/40 p-1 rounded-xl">
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="universities">Universities</TabsTrigger>
            <TabsTrigger value="semesters">Semesters</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="quick_links">Quick Links</TabsTrigger>
            <TabsTrigger value="few_links">Few Links</TabsTrigger>
            <TabsTrigger value="toppers">Toppers</TabsTrigger>
          </TabsList>

          <TabsContent value="programs" className="mt-4">
            <SimpleTableAdmin
              table="college_programs"
              orderBy={{ column: "display_order" }}
              ioColumns={["name","slug","icon_emoji","short_description","total_semesters","image","meta_title","meta_description","display_order","is_active"]}
              ioTypeHints={{ total_semesters: "number", display_order: "number", is_active: "boolean" }}
              fields={[
                { key: "name", label: "Name", required: true },
                { key: "slug", label: "Slug", required: true, placeholder: "btech" },
                { key: "icon_emoji", label: "Icon emoji" },
                { key: "short_description", label: "Description", type: "textarea" },
                { key: "total_semesters", label: "Total semesters", type: "number" },
                { key: "image", label: "Image URL" },
                { key: "meta_title", label: "Meta title" },
                { key: "meta_description", label: "Meta description", type: "textarea" },
                { key: "display_order", label: "Order", type: "number" },
                { key: "is_active", label: "Active", type: "boolean" },
              ]}
            />
          </TabsContent>

          <TabsContent value="universities" className="mt-4">
            <SimpleTableAdmin
              table="college_universities"
              orderBy={{ column: "display_order" }}
              ioColumns={["program_slug","slug","name","short_name","state","city","logo","description","total_semesters","meta_title","meta_description","display_order","is_active"]}
              ioTypeHints={{ total_semesters: "number", display_order: "number", is_active: "boolean" }}
              fields={[
                { key: "program_slug", label: "Program slug", required: true, placeholder: "btech" },
                { key: "slug", label: "University slug", required: true, placeholder: "aktu" },
                { key: "name", label: "Name", required: true },
                { key: "short_name", label: "Short name" },
                { key: "state", label: "State" },
                { key: "city", label: "City" },
                { key: "logo", label: "Logo URL" },
                { key: "description", label: "Description", type: "textarea" },
                { key: "total_semesters", label: "Total semesters", type: "number" },
                { key: "meta_title", label: "Meta title" },
                { key: "meta_description", label: "Meta description", type: "textarea" },
                { key: "display_order", label: "Order", type: "number" },
                { key: "is_active", label: "Active", type: "boolean" },
              ]}
            />
          </TabsContent>

          <TabsContent value="semesters" className="mt-4">
            <SimpleTableAdmin
              table="college_semesters"
              orderBy={{ column: "semester_num" }}
              ioColumns={["program_slug","university_slug","semester_num","title","description","is_active"]}
              ioTypeHints={{ semester_num: "number", is_active: "boolean" }}
              fields={[
                { key: "program_slug", label: "Program slug", required: true },
                { key: "university_slug", label: "University slug", required: true },
                { key: "semester_num", label: "Semester #", type: "number", required: true },
                { key: "title", label: "Title" },
                { key: "description", label: "Description", type: "textarea" },
                { key: "is_active", label: "Active", type: "boolean" },
              ]}
            />
          </TabsContent>

          <TabsContent value="subjects" className="mt-4">
            <SimpleTableAdmin
              table="college_subjects"
              orderBy={{ column: "display_order" }}
              ioColumns={["program_slug","university_slug","semester_num","slug","name","code","branch","credits","description","display_order","is_active"]}
              ioTypeHints={{ semester_num: "number", credits: "number", display_order: "number", is_active: "boolean" }}
              fields={[
                { key: "program_slug", label: "Program slug", required: true },
                { key: "university_slug", label: "University slug", required: true },
                { key: "semester_num", label: "Semester #", type: "number", required: true },
                { key: "slug", label: "Subject slug", required: true },
                { key: "name", label: "Name", required: true },
                { key: "code", label: "Subject code" },
                { key: "branch", label: "Branch (cse/mech/common)", placeholder: "common" },
                { key: "credits", label: "Credits", type: "number" },
                { key: "description", label: "Description", type: "textarea" },
                { key: "display_order", label: "Order", type: "number" },
                { key: "is_active", label: "Active", type: "boolean" },
              ]}
            />
          </TabsContent>

          <TabsContent value="resources" className="mt-4">
            <SimpleTableAdmin
              table="college_resources"
              titleKey="title"
              orderBy={{ column: "display_order" }}
              ioColumns={["subject_id","resource_type","title","description","file_url","external_url","year","display_order","is_active"]}
              ioTypeHints={{ year: "number", display_order: "number", is_active: "boolean" }}
              fields={[
                { key: "subject_id", label: "Subject ID (UUID)", required: true },
                { key: "resource_type", label: "Type (notes/pyq/lab-manual/important-questions/model-papers/viva-questions/reference-books/video-lectures)", required: true },
                { key: "title", label: "Title", required: true },
                { key: "description", label: "Description", type: "textarea" },
                { key: "file_url", label: "File URL (PDF)" },
                { key: "external_url", label: "External URL" },
                { key: "year", label: "Year", type: "number" },
                { key: "display_order", label: "Order", type: "number" },
                { key: "is_active", label: "Active", type: "boolean" },
              ]}
            />
          </TabsContent>

          <TabsContent value="quick_links" className="mt-4">
            <SimpleTableAdmin
              table="college_quick_links"
              titleKey="title"
              orderBy={{ column: "display_order" }}
              ioColumns={["program_slug","university_slug","semester_num","link_type","title","description","icon_emoji","url","display_order","is_active"]}
              ioTypeHints={{ semester_num: "number", display_order: "number", is_active: "boolean" }}
              fields={[
                { key: "program_slug", label: "Program slug", required: true },
                { key: "university_slug", label: "University slug", required: true },
                { key: "semester_num", label: "Semester # (blank = university-wide)", type: "number" },
                { key: "link_type", label: "Type (syllabus/pyq/important-questions/reference-books)", required: true },
                { key: "title", label: "Title", required: true },
                { key: "description", label: "Description" },
                { key: "icon_emoji", label: "Icon emoji" },
                { key: "url", label: "URL" },
                { key: "display_order", label: "Order", type: "number" },
                { key: "is_active", label: "Active", type: "boolean" },
              ]}
            />
          </TabsContent>

          <TabsContent value="few_links" className="mt-4">
            <SimpleTableAdmin
              table="college_few_links"
              titleKey="title"
              orderBy={{ column: "display_order" }}
              ioColumns={["program_slug","university_slug","title","url","icon_emoji","display_order","is_active"]}
              ioTypeHints={{ display_order: "number", is_active: "boolean" }}
              fields={[
                { key: "program_slug", label: "Program slug", required: true },
                { key: "university_slug", label: "University slug", required: true },
                { key: "title", label: "Title", required: true },
                { key: "url", label: "URL" },
                { key: "icon_emoji", label: "Icon emoji" },
                { key: "display_order", label: "Order", type: "number" },
                { key: "is_active", label: "Active", type: "boolean" },
              ]}
            />
          </TabsContent>

          <TabsContent value="toppers" className="mt-4">
            <SimpleTableAdmin
              table="college_toppers"
              orderBy={{ column: "display_order" }}
              ioColumns={["program_slug","university_slug","year","rank","name","branch","marks","percentage","photo","quote","display_order","is_active"]}
              ioTypeHints={{ year: "number", rank: "number", display_order: "number", is_active: "boolean" }}
              fields={[
                { key: "program_slug", label: "Program slug", required: true },
                { key: "university_slug", label: "University slug", required: true },
                { key: "year", label: "Year", type: "number", required: true },
                { key: "rank", label: "Rank", type: "number" },
                { key: "name", label: "Name", required: true },
                { key: "branch", label: "Branch" },
                { key: "marks", label: "Marks" },
                { key: "percentage", label: "Percentage / CGPA" },
                { key: "photo", label: "Photo URL" },
                { key: "quote", label: "Quote", type: "textarea" },
                { key: "display_order", label: "Order", type: "number" },
                { key: "is_active", label: "Active", type: "boolean" },
              ]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
