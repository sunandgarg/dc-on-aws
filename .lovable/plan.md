## Plan: Hook Heading + Expanded Tools + Smart Eligibility/Predictor Flow + SEO Sub-Slugs

### 1. AlsoCheck strip — new hook + AI badge + new tiles
File: `src/components/AlsoCheckSection.tsx`
- Replace heading **"Don't sleep on these · 100% FREE"** with:
  - **"AI tools every Gen-Z student is using 🔥"** + small **"AI • FREE"** chip (gradient `from-violet-500 via-fuchsia-500 to-orange-500`).
- Replace the static `Sparkles` icon next to the heading with a new mini "AI orb" mark (small SVG: orbiting dot around a core, matches Grok-style identity already in memory).
- Ensure two tiles always appear in this strip (seeded if missing in DB):
  - **Psychometric Test** → `/tools/psychometric-test`
  - **Compare Colleges** → `/compare`
  Done by merging DB modules with two hardcoded fallback items if their `key` isn't present.

### 2. SEO sub-slug routes (maximum coverage)
Goal: every meaningful filter combination becomes a crawlable URL.

New file: `src/lib/seoSubSlugs.ts`
- Builders + parsers for:
  - Eligibility checker: `/eligibility/:slug` where slug encodes `category` + `exam` + `percentage-bucket` (e.g. `obc-jee-above-85`, `general-neet-70-80`, `sc-cat-above-90`).
  - College predictor: `/college-predictor/:slug` (e.g. `jee-main-rank-under-10000-cse-delhi`).
  - Psychometric test: `/tools/psychometric-test/:slug` (e.g. `for-science-students-after-12th`).
  - Compare: `/compare/:slug` (e.g. `iit-delhi-vs-iit-bombay`).
- Each parser returns prefilled state for the page; each page reads `useParams().slug` on mount and hydrates form.

Routes: add the `:slug?` variants in `src/App.tsx` pointing to the same components.

### 3. Sitemap
File: `scripts/generate-sitemap.ts`
- Add a `seoCombos()` block that emits every combination from a curated matrix:
  - Categories × top exams × percentage buckets → eligibility URLs.
  - Top exams × rank buckets × top branches × top cities → predictor URLs.
  - Stream presets → psychometric URLs.
  - Top college pair list → compare URLs.
- Append to `all` before dedupe.

### 4. Eligibility Checker — new flow (no AI hit on low marks)
File: `src/components/tools/EligibilityCheckerTool.tsx` (rewrite, keep export name)
Flow:
1. Form: `%`, `category`, `exam` (dropdown), `city` (optional).
2. **On submit, compute eligibility client-side first** (no AI).
3. **If below threshold for category/exam**:
   - Show lead-capture sheet (`LeadCaptureForm` inline, `source="eligibility_low_score"`).
   - After lead submit (or skip), show friendly message: *"Your score is below the typical cutoff for X — but here are great colleges in {city} you can still target."* + list city colleges from `colleges` table (query by `city`/`state`, limit 12, with **Apply** CTA opening `LeadCaptureForm`).
   - **No AI call.**
4. **If eligible**:
   - Show **DekhoCampus AI loader** (rocket-launch SVG with orange/rose gradient pulse — matches premium-course theme) while AI generates verdict.
   - Render **short** "AI Personalised Verdict for you" (2-3 lines + 3-5 bullet points, capped).
   - "Colleges from across India you're eligible for" — pulled from web (via existing AI counselor edge function, or static curated list per exam if no internet result).
   - "Apply now from DekhoCampus" — colleges from our DB that match category + score range; each row has **Apply** button → `LeadCaptureForm`.

New small component: `src/components/tools/DekhoCampusAILoader.tsx`
- Rocket SVG, animated `translate-y` + flame gradient, "DekhoCampus AI is analysing…" text, shimmer.

### 5. College Predictor — mirror the same flow
File: `src/pages/CollegePredictor.tsx`
- Same pattern: client-side rank check → if rank too low for chosen branch/college tier, lead-gate + show city/state colleges (no AI).
- If eligible: rocket loader → short AI verdict → web-eligible colleges → our DB colleges with Apply.
- Hydrate from `:slug` param via `parsePredictorSlug`.

### 6. Hook up URL ↔ filters
- Each page writes the canonical sub-slug into the URL via `navigate(/eligibility/${slug}, { replace: true })` whenever the form submits, so every search produces a shareable, indexable URL.

### Technical notes
- AI calls: continue using existing `ai-counselor` edge function (Lovable AI / gemini-2.5-flash) — only invoked on the *eligible* branch.
- No DB migration needed; reuses `colleges`, `leads`, `also_check_modules` tables.
- All copy stays in component code (Gen-Z tone, semantic tokens, orange primary — per project memory).
- Lead form uses existing `LeadCaptureForm` with new `source` tags for analytics.
- Loader uses semantic tokens (`from-primary to-orange-500`), no hardcoded colors.

### Files touched
- `src/components/AlsoCheckSection.tsx` (edit)
- `src/components/tools/EligibilityCheckerTool.tsx` (rewrite)
- `src/components/tools/DekhoCampusAILoader.tsx` (new)
- `src/pages/CollegePredictor.tsx` (rewrite flow)
- `src/lib/seoSubSlugs.ts` (new)
- `src/App.tsx` (add `:slug?` routes)
- `scripts/generate-sitemap.ts` (add combos)
