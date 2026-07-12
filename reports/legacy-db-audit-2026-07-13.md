# Legacy DB audit - 2026-07-13

Source dump scanned:

- `/Users/sunandgarg/Desktop/DekhoCampus/COMPELTE BACKUPPPP WEBSITE/dekhocampus-complete-backup/dekhocampus-database-full.sql`

What this specific dump actually contains:

- colleges: 11
- courses: 25
- exams: 12
- blog_posts/articles: 88
- states: 150
- cities: 4206
- common_categories: 11
- article categories: 11
- directus users/authors: 11

Normalization findings:

- `college.established_in` is stored as a date like `2002-01-01` and must be reduced to a plain integer year like `2002` for the current Supabase schema.
- `college.state`, `college.city`, `course.category`, `exam.category`, and `blog_posts.category` are legacy foreign-key ids and must be resolved through reference tables before insertion.
- `blog_posts.author` is a legacy Directus user id and must be converted to a readable author name.
- Media fields in the legacy dump point to Directus file ids. Since this import excludes image/file migration, those fields should be blanked instead of copying opaque ids into live content rows.
- Legacy exam and course meta keywords may be JSON arrays and should be flattened to readable comma-separated text.

Importer hardening completed in:

- `scripts/import-legacy-directus.ts`

Hardening added:

- state id -> state name mapping
- city id -> city name mapping
- common category id -> category label mapping
- article category id -> category label mapping
- author id -> author name mapping
- `established_in` -> integer year normalization
- blank media targets when assets are intentionally excluded
- top recruiter extraction from legacy college placement relation tables
- fee summary derivation from `course_and_fee` relation data

Important limitation from this Codex session:

- live Supabase insertion was not executed here because this environment is running Node `v14.17.6` while the repo importer depends on modern `tsx` execution, and this session also does not have reliable remote Supabase access for a truth-backed apply run.
- because of that, this audit confirms the mapping and updates the importer, but does not claim that remote rows were inserted from this session.
