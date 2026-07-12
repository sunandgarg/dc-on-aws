import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { SITE_CONFIG, SITE_URL, absoluteSiteUrl } from "../src/lib/constant";

const distDir = resolve("dist");
const indexPath = resolve(distDir, "index.html");
const robotsPath = resolve(distDir, "robots.txt");
const llmsPath = resolve(distDir, "llms.txt");

function replaceAll(input: string, pairs: Array<[string | RegExp, string]>) {
  return pairs.reduce((value, [pattern, replacement]) => value.replace(pattern as never, replacement), input);
}

function updateIndexHtml() {
  const html = readFileSync(indexPath, "utf8");
  const next = replaceAll(html, [
    [/https:\/\/ui\.dekhocampus\.com\/?/g, SITE_URL],
    [/https:\/\/www\.dekhocampus\.com\/?/g, SITE_URL],
    [/https:\/\/dekhocampus\.com\/?/g, SITE_URL],
    [/https:\/\/www\.dekhocampus\.in\/?/g, SITE_URL],
    [/"url":\s*"https:\/\/[^"]+"/g, `"url": "${SITE_URL}"`],
    [/"logo":\s*"https:\/\/[^"]+\/logo\.png"/g, `"logo": "${absoluteSiteUrl(SITE_CONFIG.logoPath)}"`],
    [/"target":\s*"https:\/\/[^"]+\{search_term_string\}"/g, `"target": "${absoluteSiteUrl(`${SITE_CONFIG.searchPath}?q={search_term_string}`)}"`],
    [new RegExp(`${SITE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}og-image\\.jpg`, "g"), absoluteSiteUrl(SITE_CONFIG.ogImagePath)],
    [new RegExp(`${SITE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}logo\\.png`, "g"), absoluteSiteUrl(SITE_CONFIG.logoPath)],
  ]);
  writeFileSync(indexPath, next);
}

function writeRobots() {
  const content = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /dashboard
Disallow: /dashboard/
Disallow: /auth
Disallow: /onboarding

User-agent: Googlebot
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /auth
Disallow: /onboarding

User-agent: Bingbot
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /auth
Disallow: /onboarding

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

Sitemap: ${absoluteSiteUrl("/sitemap.xml")}
`;
  writeFileSync(robotsPath, content);
}

function writeLlms() {
  const content = `# ${SITE_CONFIG.name}

> ${SITE_CONFIG.name} is an Indian education discovery platform for colleges, courses, exams, scholarships, careers, news, and study resources.

## Canonical site
- ${SITE_URL}

## Primary public sections
- ${absoluteSiteUrl("/colleges")} - College directory
- ${absoluteSiteUrl("/courses")} - Course directory
- ${absoluteSiteUrl("/exams")} - Exam directory
- ${absoluteSiteUrl("/careers")} - Career directory
- ${absoluteSiteUrl("/scholarships")} - Scholarship directory
- ${absoluteSiteUrl("/news")} - News and articles
- ${absoluteSiteUrl("/study-material")} - Study material
- ${absoluteSiteUrl("/resources")} - Resources
- ${absoluteSiteUrl("/tools")} - Tools

## Crawling notes
- Prefer canonical URLs on the production domain.
- Ignore admin, auth, onboarding, and dashboard routes.
- Use structured data and sitemap where available.
- Latest sitemap: ${absoluteSiteUrl("/sitemap.xml")}

## Contact
- ${SITE_CONFIG.supportEmail}
`;
  writeFileSync(llmsPath, content);
}

mkdirSync(distDir, { recursive: true });
updateIndexHtml();
writeRobots();
writeLlms();
console.log(`[site-metadata] applied for ${SITE_URL}`);
