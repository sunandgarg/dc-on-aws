import { AdminLayout } from "@/components/AdminLayout";
import { SimpleTableAdmin } from "@/components/admin/SimpleTableAdmin";

import { CSVTools } from "@/components/CSVTools";
// Industry-standard option libraries - admins can also type custom values
// (the combobox supports free-text "Add 'xyz'") so this list never blocks.
const DESIGNATION_OPTIONS = [
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Lecturer",
  "Senior Lecturer",
  "Visiting Faculty",
  "Adjunct Faculty",
  "Guest Faculty",
  "Head of Department (HoD)",
  "Dean",
  "Associate Dean",
  "Vice Dean",
  "Director",
  "Vice Chancellor",
  "Pro Vice Chancellor",
  "Registrar",
  "Principal",
  "Vice Principal",
  "Research Scholar",
  "Postdoctoral Fellow",
  "Industry Mentor",
  "Chair Professor",
  "Emeritus Professor",
];

const DEPARTMENT_OPTIONS = [
  "Computer Science & Engineering",
  "Information Technology",
  "Artificial Intelligence & Machine Learning",
  "Data Science",
  "Electronics & Communication",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Biotechnology",
  "Aerospace Engineering",
  "Automobile Engineering",
  "Mining Engineering",
  "Architecture",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Statistics",
  "Economics",
  "Commerce",
  "Accounting & Finance",
  "Marketing",
  "Human Resources",
  "Operations & Supply Chain",
  "International Business",
  "Business Analytics",
  "Strategy & Entrepreneurship",
  "English",
  "Hindi",
  "Foreign Languages",
  "History",
  "Political Science",
  "Sociology",
  "Psychology",
  "Philosophy",
  "Geography",
  "Law",
  "Medicine",
  "Surgery",
  "Pharmacy",
  "Nursing",
  "Dental Sciences",
  "Physiotherapy",
  "Hospitality & Hotel Management",
  "Fashion Design",
  "Interior Design",
  "Visual Communication",
  "Animation & Multimedia",
  "Journalism & Mass Communication",
  "Performing Arts",
  "Physical Education",
];

const QUALIFICATION_OPTIONS = [
  "PhD",
  "Postdoc",
  "DSc",
  "DLitt",
  "MTech",
  "ME",
  "MS",
  "MSc",
  "MA",
  "MCom",
  "MBA",
  "PGDM",
  "MCA",
  "MPhil",
  "MD",
  "MS (Surgery)",
  "MDS",
  "DM",
  "MCh",
  "LLM",
  "MArch",
  "MDes",
  "MFA",
  "BTech",
  "BE",
  "BSc",
  "BA",
  "BCom",
  "BBA",
  "BCA",
  "MBBS",
  "BDS",
  "BAMS",
  "BHMS",
  "LLB",
  "BArch",
  "BDes",
  "BFA",
  "Chartered Accountant (CA)",
  "Company Secretary (CS)",
  "Cost & Management Accountant (CMA)",
  "FCA",
  "FRCS",
];

export default function AdminFaculty() {
  return (
    <AdminLayout title="Faculty">
      <div className="mb-4">
        <CSVTools table="faculty" filename="faculty.csv" columns="*" upsertKey="id" />
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Manage faculty members shown on college pages. Designation, Department & Qualification
        offer a searchable picker - pick from the list or type your own.
      </p>
      <SimpleTableAdmin
        table="faculty"
        titleKey="name"
        subtitleKey="designation"
        orderBy={{ column: "display_order" }}
        previewBasePath="/colleges"
        previewSlugKey="college_slug"
        previewSuffix="#faculty"
        defaultValues={{ college_slug: "", name: "", designation: "", department: "", qualification: "", photo: "", bio: "", linkedin_url: "", gender: "male", display_order: 0, is_active: true }}
        ioColumns={["college_slug","name","designation","department","qualification","photo","linkedin_url","gender","display_order","bio","is_active"]}
        ioTypeHints={{ display_order: "number", is_active: "boolean" }}
        fields={[
          { key: "college_slug", label: "College Slug", required: true, placeholder: "iisc-bangalore" },
          { key: "name", label: "Name", required: true },
          { key: "designation", label: "Designation", type: "combobox", options: DESIGNATION_OPTIONS, placeholder: "Search designation…" },
          { key: "department", label: "Department", type: "combobox", options: DEPARTMENT_OPTIONS, placeholder: "Search department…" },
          { key: "qualification", label: "Qualification", type: "combobox", options: QUALIFICATION_OPTIONS, placeholder: "Search qualification…" },
          { key: "photo", label: "Photo URL (optional - animated avatar shown if empty)" },
          { key: "linkedin_url", label: "LinkedIn Profile URL (optional)", placeholder: "https://www.linkedin.com/in/…" },
          { key: "gender", label: "Gender (male/female) - used for default avatar", type: "combobox", options: ["male", "female", "other"] },
          { key: "display_order", label: "Display Order", type: "number" },
          { key: "bio", label: "Bio", type: "textarea" },
        ]}
      />
    </AdminLayout>
  );
}
