export const SITE_CONFIG = {
  name: "DekhoCampus",
  domain: "www.dekhocampus.in",
  scheme: "https",
  supportEmail: "hello@dekhocampus.com",
  searchPath: "/search",
  ogImagePath: "/og-image.jpg",
  logoPath: "/logo.png",
} as const;

export const SITE_URL = `${SITE_CONFIG.scheme}://${SITE_CONFIG.domain}`;
export const SITE_HOST = SITE_CONFIG.domain;

export function absoluteSiteUrl(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function absoluteCanonical(urlOrPath?: string) {
  if (!urlOrPath) return undefined;
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  return absoluteSiteUrl(urlOrPath);
}
