import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Code, Users, Database, Layers, Globe, Bot, BarChart3, Megaphone, GraduationCap, BookOpen, FileText, Star, HelpCircle, Newspaper, Shield, Zap } from "lucide-react";

type TabId = "developer" | "admin";

const sections = {
  developer: [
    {
      icon: Layers,
      title: "Tech Stack",
      content: `**Frontend:** React 18 + TypeScript + Vite (blazing fast HMR)
**Styling:** Tailwind CSS + shadcn/ui component library
**State Management:** TanStack React Query (server state caching)
**Routing:** React Router v6 with lazy-loaded code splitting
**Backend:** Lovable Cloud (Supabase-powered PostgreSQL + Edge Functions)
**AI Integration:** Google Gemini Flash via Lovable AI Gateway (streaming SSE)
**Animations:** Framer Motion for all transitions and micro-interactions`,
    },
    {
      icon: Database,
      title: "Database Schema",
      content: `**10 tables** powering the entire platform:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| \`colleges\` | 60+ fields per institution | name, slug, fees, placements, rankings, SEO meta, rich content sections |
| \`courses\` | Course catalog with eligibility & careers | name, subjects, specializations, fee ranges, entrance exams |
| \`exams\` | Entrance exam database | dates, pattern, syllabus, eligibility, important_dates (JSON) |
| \`articles\` | Blog/news content | rich text content, categories, tags, SEO metadata |
| \`leads\` | User lead data | name, phone, email, source, interested items |
| \`ads\` | Ad campaigns with targeting | target_type, target_page, target_city, priority, date ranges |
| \`featured_colleges\` | Priority listing ordering | college_slug, display_order, category filter |
| \`faqs\` | Page/item-specific FAQs | question, answer, page, item_slug |
| \`popular_places\` | City exploration data | name, state, college_count, image |
| \`profiles\` + \`user_roles\` | Auth & RBAC | user_id, role (admin/moderator/user) |`,
    },
    {
      icon: Code,
      title: "Code Architecture",
      content: `\`\`\`
src/
├── components/         # Reusable UI components
│   ├── ui/             # shadcn/ui base components (Button, Input, etc.)
│   ├── tools/          # Calculator & utility tool components
│   ├── HeroSection     # Landing hero with unified AI search
│   ├── AIChatFullScreen # Full-screen AI counselor interface
│   ├── FloatingBot     # Floating chatbot widget
│   ├── LeadCaptureForm # Multi-variant lead form (card/banner/sidebar/inline)
│   ├── DynamicAdBanner # Targeted ad rendering engine
│   ├── ScrollSpy       # Sticky tab navigation for detail pages
│   └── ...50+ components
├── pages/              # Route-level page components
│   ├── Index           # Homepage with 8-section layout
│   ├── All[Entity]     # Listing pages with filters & sidebar
│   ├── [Entity]Detail  # Detail pages with scroll-spy sections
│   └── Admin*          # Admin panel pages
├── hooks/              # Custom React hooks
│   ├── use[Entity]Data # Supabase query hooks (React Query)
│   ├── useAds          # Ad targeting & delivery hook
│   ├── useAuth         # Authentication context
│   └── useFeaturedColleges # Featured ordering hook
├── data/               # Static fallback data
├── integrations/       # Supabase client & auto-generated types
└── assets/             # Images and static files

supabase/functions/
├── ai-counselor/       # AI chat with streaming SSE
└── save-lead/          # Lead persistence endpoint
\`\`\``,
    },
    {
      icon: Globe,
      title: "Routing & Navigation",
      content: `**Public Routes:**
- \`/\` - Homepage (hero, search, featured, categories, tools)
- \`/colleges\` → \`/colleges/:slug\` → \`/colleges/:slug/:tab\` - College listing, detail & sub-sections
- \`/courses\` → \`/courses/:slug\` → \`/courses/:slug/:tab\` - Course listing, detail & sub-sections
- \`/exams\` → \`/exams/:slug\` → \`/exams/:slug/:tab\` - Exam listing, detail & sub-sections
- \`/articles\` → \`/articles/:slug\` - Article listing & detail

**Sub-slug Pattern (Collegedunia-style):**
- \`/colleges/iit-delhi/overview\` - College overview tab
- \`/colleges/iit-delhi/courses\` - Courses at this college
- \`/colleges/iit-delhi/fees\` - Fee structure
- \`/colleges/iit-delhi/placements\` - Placement info
- Same pattern for courses and exams

**Admin Routes (open access):**
- \`/admin\` - Dashboard with stats & quick actions
- \`/admin/colleges|courses|exams|articles\` - Content CRUD
- \`/admin/ads\` - Ad campaign management
- \`/admin/featured\` - Featured college ordering
- \`/admin/leads\` - Lead management
- \`/admin/content\` - FAQs & popular places
- \`/admin/banners\` - Hero banner management
- \`/admin/partners\` - Trusted partners management
- \`/admin/docs\` - This documentation page

All routes use **lazy loading** via \`React.lazy()\` for optimal bundle splitting.`,
    },
    {
      icon: Bot,
      title: "AI System Architecture",
      content: `**Flow:**
1. User types query in hero search → clicks "Ask AI"
2. \`AILeadForm\` modal captures name, course, state, city
3. Lead saved to \`leads\` table via \`save-lead\` edge function
4. \`AIChatFullScreen\` opens with context-aware greeting
5. User query sent to \`ai-counselor\` edge function
6. Edge function calls Lovable AI Gateway (Gemini Flash)
7. Response streamed back via **Server-Sent Events (SSE)**
8. Frontend parses SSE chunks and renders markdown in real-time

**System Prompt:** The AI acts as "DekhoCampus Educational AI" with expertise in Indian education, progressive lead collection, and soft CTAs for counseling.

**Streaming Protocol:** OpenAI-compatible SSE format with \`data: {JSON}\` lines and \`data: [DONE]\` terminator.`,
    },
    {
      icon: Megaphone,
      title: "Ad Targeting Engine",
      content: `**Hierarchical Fallback System:**

\`\`\`
Priority: Item-specific → Page+City → Page-only → City-only → Universal
\`\`\`

**Implementation:** \`useAds()\` hook queries the \`ads\` table with filters:
1. Match \`target_item_slug\` (highest priority)
2. Match \`target_page\` + \`target_city\`
3. Match \`target_page\` only
4. Match \`target_city\` only
5. Fall back to \`target_type = 'universal'\`

**Variants:** leaderboard (728×90), horizontal (728×200), vertical (300×600), square (300×300)
**Features:** Date-based scheduling, active/inactive toggle, custom images with dark overlay.`,
    },
    {
      icon: Shield,
      title: "Lead Capture Strategy",
      content: `**3-Layer Lead Generation:**

1. **AI Intercept Modal** (\`AILeadForm\`) - Mandatory before AI chat access. Captures: name, course interest, state, city.

2. **Page-Level Forms** (\`LeadCaptureForm\`) - 4 variants:
   - \`card\` - Full form in sidebar (name, phone, email, course, state, city)
   - \`banner\` - Horizontal CTA with inline fields
   - \`sidebar\` - Compact vertical form
   - \`inline\` - Minimal row at bottom of content

3. **Persistent CTA** (\`FixedCounsellingCTA\`) - Fixed bottom bar offering free counselling, expands to capture form.

4. **Floating Chatbot** (\`FloatingBot\`) - Progressive collection during conversation (query → name → situation → city → contact).

**Sources tracked:** homepage_mid, college_detail_*, courses_listing, chatbot, etc.`,
    },
    {
      icon: Zap,
      title: "Performance Optimizations",
      content: `- **Code Splitting:** All pages lazy-loaded (\`React.lazy\`)
- **Image Lazy Loading:** \`loading="lazy"\` on non-critical images
- **React Query Caching:** Server state cached & deduplicated
- **Tailwind JIT:** Only used CSS classes shipped
- **Bundle Size:** Component-level imports for icons (tree-shaking)
- **Font Loading:** Google Fonts with \`display=swap\`
- **Animations:** GPU-accelerated via Framer Motion transforms`,
    },
  ],
  admin: [
    {
      icon: BarChart3,
      title: "Dashboard Overview",
      content: `The **Dashboard** (\`/admin\`) gives you a quick snapshot:

- **Active Ads** - Number of currently running ad campaigns
- **Featured Colleges** - Colleges promoted to top of listings
- **Total Leads** - All student inquiries collected
- **Total Ads** - All ad campaigns (active + inactive)

Use the **Quick Actions** section to jump directly to any management area.`,
    },
    {
      icon: GraduationCap,
      title: "Managing Colleges",
      content: `**Add/Edit colleges** with these key sections:

- **Basic Info:** Name, short name, slug (URL), location, state, city
- **Classification:** Category (Engineering/Medical/etc.), Type (Govt/Private), Approvals (AICTE/UGC)
- **Academic:** Courses count, fees, placement stats, ranking, NAAC grade
- **Rich Content:** Description, highlights, facilities, admission process, scholarship details
- **SEO:** Meta title, meta description, meta keywords
- **Media:** Main image, logo, carousel images, gallery

💡 **Tip:** The \`slug\` field determines the URL (e.g., "iit-delhi" → /colleges/iit-delhi). Keep it lowercase with hyphens.`,
    },
    {
      icon: BookOpen,
      title: "Managing Courses",
      content: `Each course has:

- **Overview:** Name, full name, category, level (UG/PG/Diploma)
- **Details:** Duration, mode (Full-time/Online), eligibility criteria
- **Financials:** Fee range (low to high), average fees
- **Career:** Specializations, career paths, average salary, growth rate
- **Academic:** Subjects, syllabus, top entrance exams
- **Rich Content:** About, scope, placements, admissions sections
- **SEO:** Complete meta fields for search engine optimization

💡 **Tip:** Link courses to relevant exams in the "Top Exams" field - this creates cross-references on the website.`,
    },
    {
      icon: FileText,
      title: "Managing Exams",
      content: `Exam entries include:

- **Core Info:** Name, full name, category, level (National/State)
- **Schedule:** Application start/end dates, exam date, result date
- **Details:** Mode (Online/Offline), duration, frequency, language
- **Content:** Eligibility, exam pattern, syllabus topics, preparation tips
- **Important Dates:** Dynamic JSON field for multiple date entries
- **Associations:** Top colleges accepting this exam

💡 **Tip:** Keep the \`status\` field updated (Upcoming → Applications Open → Exam Over) to show accurate info on the website.`,
    },
    {
      icon: Newspaper,
      title: "Managing Articles",
      content: `Write and publish educational content:

- **Content:** Title, description, full content (supports Markdown)
- **Classification:** Category, tags, vertical
- **Media:** Featured image
- **SEO:** Meta title, description, keywords
- **Status:** Draft or Published

💡 **Tip:** Use categories that match your audience (Exam Tips, Career Guidance, College Reviews). Articles appear on the homepage news section and the articles listing page.`,
    },
    {
      icon: Megaphone,
      title: "Ad Campaign Management",
      content: `**Creating Ads:**

1. **Title & Subtitle** - What users see on the ad
2. **CTA Text** - Button text (e.g., "Apply Now", "Learn More")
3. **Link URL** - Where the ad clicks through to
4. **Background** - Gradient color or custom image URL
5. **Targeting:**
   - **Universal** - Shows everywhere as fallback
   - **Page-specific** - Shows on colleges/courses/exams/articles pages
   - **Item-specific** - Shows on a specific college/course detail page
   - **City-specific** - Shows to users in a specific city
6. **Schedule** - Start and end dates
7. **Priority** - Higher number = shown first

**Image Guidelines:**
- Leaderboard: 728×90px
- Horizontal: 728×200px
- Sidebar Vertical: 300×600px
- Square: 300×300px

💡 **Priority Order:** Item → Page+City → Page → City → Universal`,
    },
    {
      icon: Star,
      title: "Featured Colleges",
      content: `Promote specific colleges to appear at the **top of listings**:

1. Enter the college's **slug** (URL identifier, e.g., "iit-delhi")
2. Set **display order** (lower number = higher position)
3. Optionally filter by **category** or **state**
4. Toggle **active/inactive**

Featured colleges appear before regular colleges in the listing pages and may also appear in the homepage featured section.`,
    },
    {
      icon: Users,
      title: "Understanding Leads",
      content: `Leads are collected from multiple touchpoints:

| Source | When Captured |
|--------|---------------|
| AI Chat Lead Form | Before starting AI counselor session |
| College Detail Form | On college pages (sidebar + bottom) |
| Course Detail Form | On course pages |
| Exam Detail Form | On exam pages |
| Homepage Banner | Mid-page CTA on homepage |
| Floating Chatbot | During chatbot conversation |
| Fixed Bottom CTA | Persistent bottom bar |

Each lead includes: Name, Phone, Email, Course Interest, State, City, Source, and optionally the specific college/course/exam they were viewing.

💡 **Tip:** High-intent leads come from detail page forms and AI chat - prioritize these for follow-up.`,
    },
    {
      icon: HelpCircle,
      title: "Content Management",
      content: `**FAQs:**
- Add questions & answers for any page
- Target specific items (e.g., FAQs for "iit-delhi" college page)
- Set display order and active/inactive status

**Popular Places:**
- Cities shown in the "Explore by City" section
- Each has: name, state, college count, optional image
- Set display order to control arrangement

💡 **Tip:** Adding item-specific FAQs (e.g., for individual colleges) improves SEO and helps students find answers quickly.`,
    },
  ],
};

export default function AdminDocs() {
  const [activeTab, setActiveTab] = useState<TabId>("admin");

  return (
    <AdminLayout title="Project Documentation">
      {/* Tab Selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("admin")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "admin" ? "gradient-primary text-primary-foreground shadow-lg" : "bg-card border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          For Admin
        </button>
        <button
          onClick={() => setActiveTab("developer")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "developer" ? "gradient-accent text-accent-foreground shadow-lg" : "bg-card border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Code className="w-4 h-4" />
          For Developer
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        {activeTab === "admin"
          ? "Learn how to manage the DekhoCampus platform - content, ads, leads, and more."
          : "Technical deep-dive into the architecture, database schema, code patterns, and integrations."}
      </p>

      {/* Content Sections */}
      <div className="space-y-4">
        {sections[activeTab].map((section, i) => (
          <details key={i} className="bg-card rounded-2xl border border-border overflow-hidden group" open={i === 0}>
            <summary className="flex items-center gap-3 p-5 cursor-pointer hover:bg-muted/30 transition-colors list-none [&::-webkit-details-marker]:hidden">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === "developer" ? "bg-accent/10" : "bg-primary/10"}`}>
                <section.icon className={`w-5 h-5 ${activeTab === "developer" ? "text-accent" : "text-primary"}`} />
              </div>
              <h3 className="text-base font-bold text-foreground flex-1">{section.title}</h3>
              <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="px-5 pb-5 border-t border-border pt-4">
              <div className="prose prose-sm max-w-none text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-table:text-sm prose-th:text-foreground prose-td:text-muted-foreground whitespace-pre-wrap">
                {section.content.split("\n").map((line, j) => {
                  if (line.startsWith("**") && line.endsWith("**")) {
                    return <h4 key={j} className="font-bold text-foreground mt-3 mb-1">{line.replace(/\*\*/g, "")}</h4>;
                  }
                  if (line.startsWith("- ")) {
                    return <p key={j} className="ml-3 text-sm text-muted-foreground">• {line.slice(2)}</p>;
                  }
                  if (line.startsWith("💡")) {
                    return <p key={j} className="text-sm mt-2 p-3 bg-primary/5 rounded-xl border border-primary/10 text-foreground">{line}</p>;
                  }
                  if (line.startsWith("|")) {
                    return null; // Skip table rows (rendered as pre-formatted text)
                  }
                  if (line.startsWith("```")) return null;
                  if (line.trim() === "") return <br key={j} />;
                  return <p key={j} className="text-sm text-muted-foreground leading-relaxed">{line}</p>;
                })}
              </div>
            </div>
          </details>
        ))}
      </div>
    </AdminLayout>
  );
}
