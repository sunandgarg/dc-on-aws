# Legacy max extraction audit - 2026-07-13

Backup roots checked:

- `/Users/sunandgarg/Desktop/DekhoCampus/COMPELTE BACKUPPPP WEBSITE/dekhocampus-complete-backup/dekhocampus-database-full.sql`
- `/Users/sunandgarg/Desktop/DekhoCampus/COMPELTE BACKUPPPP WEBSITE/dekhocampus-complete-backup/dekhocampus-code-files-full/var/www/dc-frontend-alpha/.next/server/pages`

## What the SQL dump contains

Counted across all `INSERT INTO ... VALUES ...;` statements, not just the first one:

- `college`: 11
- `course`: 25
- `exam`: 12
- `blog_posts`: 1900

This means the SQL dump is the richest source for articles, but not for colleges, courses, or exams.

## What the static Next.js export contains

Folder scan from `dc-frontend-alpha/.next/server/pages`:

- `college/**/*.json`: 2201 files
- `courses/**/*.json`: 836 files
- `exams/**/*.json`: 228 files

After validating actual page payload structure:

- valid college pages with `pageProps.college.clg_slug` and `clg_name`: 555 unique slugs
- valid course pages with `pageProps.course.course_slug` and `course_name`: 835 unique slugs
- valid exam pages with `pageProps.exam.slug` and `name`: 217 unique slugs

Notes:

- many `college/*.json` files are not real college payload records, so raw file count is much higher than importable entity count
- exam files include duplicates, so unique valid exam slugs are lower than raw file count
- no equivalent large static article export was found in `.next/server/pages/news`; the folder only contains route code artifacts, not per-article JSON payload files

## Best available extraction plan

To extract the maximum usable data from the backup set:

- colleges -> import from static archive (`import:static`)
- courses -> import from static archive (`import:static`)
- exams -> import from static archive (`import:static`)
- articles -> import from SQL dump (`import:legacy`)

## Best currently supportable maximum from the supplied backup

- colleges: about 555
- courses: about 835
- exams: about 217
- articles: about 1900

This is the best evidence-backed maximum from the artifacts currently available in the backup checked during this session.
