// Centralized RBAC capability matrix
export type AppRole = "admin" | "manager" | "editor" | "contributor" | "lead_push" | "user";
export type Module =
  | "articles" | "colleges" | "courses" | "exams" | "study_material"
  | "leads" | "users" | "integrations" | "backup" | "ads" | "banners"
  | "promoted_programs" | "featured" | "ai_providers" | "otp_providers"
  | "applications" | "referrals" | "careers" | "companies" | "placements"
  | "faculty" | "facilities" | "contacts" | "course_fees" | "partners"
  | "content" | "legal" | "sitemap" | "docs";

export type Action = "view" | "create" | "edit" | "edit_own" | "delete" | "publish";

// admin & manager defaults: full
const ALL: Action[] = ["view", "create", "edit", "edit_own", "delete"];
const VIEW: Action[] = ["view"];
const CREATE_ONLY: Action[] = ["view", "create"]; // can add but not change after save
const EDIT_OWN: Action[] = ["view", "create", "edit_own"]; // edit only their own
const NO_DELETE: Action[] = ["view", "create", "edit", "edit_own"];

type Matrix = Record<AppRole, Partial<Record<Module, Action[]>>>;

export const CAPABILITIES: Matrix = {
  admin: Object.fromEntries(
    ([
      "articles","colleges","courses","exams","study_material","leads","users",
      "integrations","backup","ads","banners","promoted_programs","featured",
      "ai_providers","otp_providers","applications","referrals","careers",
      "companies","placements","faculty","facilities","contacts","course_fees",
      "partners","content","legal","sitemap","docs",
    ] as Module[]).map(m => [m, ALL])
  ),
  manager: {
    articles: NO_DELETE, colleges: NO_DELETE, courses: NO_DELETE, exams: NO_DELETE,
    study_material: NO_DELETE, leads: VIEW, applications: NO_DELETE, referrals: VIEW,
    ads: NO_DELETE, banners: NO_DELETE, promoted_programs: NO_DELETE, featured: NO_DELETE,
    careers: NO_DELETE, companies: NO_DELETE, placements: NO_DELETE, faculty: NO_DELETE,
    facilities: NO_DELETE, contacts: NO_DELETE, course_fees: NO_DELETE,
    partners: NO_DELETE, content: NO_DELETE, legal: NO_DELETE, sitemap: VIEW, docs: VIEW,
  },
  editor: {
    articles: NO_DELETE, colleges: CREATE_ONLY, courses: VIEW, exams: VIEW,
    study_material: NO_DELETE, content: NO_DELETE, faculty: NO_DELETE,
  },
  contributor: {
    articles: EDIT_OWN, // can add new, edit only their own, never delete
  },
  lead_push: {
    leads: VIEW, // can see All Leads + Lead Push hub (path-gated in ProtectedRoute)
  },
  user: {},
};

export function highestRole(roles: AppRole[]): AppRole {
  const order: AppRole[] = ["admin", "manager", "editor", "contributor", "user"];
  return order.find(r => roles.includes(r)) ?? "user";
}

export function can(roles: AppRole[], module: Module, action: Action): boolean {
  for (const r of roles) {
    const allowed = CAPABILITIES[r]?.[module];
    if (allowed?.includes(action)) return true;
  }
  return false;
}

// Convenience: any-action access (used to show/hide nav items)
export function canAccessModule(roles: AppRole[], module: Module): boolean {
  return roles.some(r => !!CAPABILITIES[r]?.[module]?.length);
}
