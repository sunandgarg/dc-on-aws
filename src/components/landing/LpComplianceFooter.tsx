/**
 * Google Ads / Meta Ads policy 2026-aligned footer for landing pages.
 * Provides:
 *  - Clear advertiser identity (name + address + contact)
 *  - "This is an advertisement" disclosure
 *  - Privacy + Terms links + Do-Not-Sell + Contact
 *  - Non-misleading copy disclaimer
 */
export function LpComplianceFooter({
  brand,
  advertiserName,
  advertiserAddress,
  advertiserContact,
  disclosureText,
  privacyUrl,
  termsUrl,
  footerText,
}: {
  brand: string;
  advertiserName?: string;
  advertiserAddress?: string;
  advertiserContact?: string;
  disclosureText?: string;
  privacyUrl?: string;
  termsUrl?: string;
  footerText?: string;
}) {
  const advName = advertiserName || brand;
  return (
    <footer className="border-t bg-white text-sm">
      <div className="px-5 md:px-12 py-8 grid md:grid-cols-3 gap-6">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-60 mb-1">Advertiser</div>
          <div className="font-bold">{advName}</div>
          {advertiserAddress && <div className="opacity-75 mt-1 leading-relaxed text-xs">{advertiserAddress}</div>}
          {advertiserContact && <div className="opacity-75 mt-1 text-xs">Contact: {advertiserContact}</div>}
        </div>
        <div className="md:col-span-2">
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-60 mb-1">Disclosure</div>
          <p className="opacity-80 text-xs leading-relaxed">
            {disclosureText ||
              "This page is an advertisement. Information shown is for educational lead-generation purposes only and is not an offer of admission, scholarship, employment, financial aid, or guaranteed outcome. Programs, fees, and eligibility are subject to change at the institution's discretion."}
          </p>
          <p className="opacity-70 text-[11px] leading-relaxed mt-2">
            We collect the contact details you submit only to share program information with you. We do not sell your data.
            You can opt out anytime by replying STOP to any SMS or emailing us at the contact above.
          </p>
        </div>
      </div>
      <div className="border-t px-5 md:px-12 py-4 flex flex-wrap gap-x-4 gap-y-2 items-center justify-between text-xs opacity-75">
        <div>{footerText || `© ${new Date().getFullYear()} ${brand}. All rights reserved.`}</div>
        <div className="flex gap-4">
          <a href={privacyUrl || "/legal/privacy"} className="underline">Privacy Policy</a>
          <a href={termsUrl || "/legal/terms"} className="underline">Terms</a>
          <a href="/legal/disclaimer" className="underline">Ad Disclaimer</a>
          <a href="/contact" className="underline">Contact</a>
        </div>
      </div>
    </footer>
  );
}

export function LpComplianceHeader({
  brand,
  logoUrl,
  navLinks = [],
  ctaLabel,
  ctaHref,
}: {
  brand: string;
  logoUrl?: string;
  navLinks?: { label: string; href: string }[];
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b">
      {/* Sponsored disclosure strip - required for clarity under Google Ads 2026 policy */}
      <div className="text-[10px] uppercase tracking-wider text-center py-1 bg-[var(--lp-accent)] text-[var(--lp-primary)] font-bold">
        Sponsored · Advertisement
      </div>
      <div className="px-5 md:px-12 py-3 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2 font-bold text-lg">
          {logoUrl ? <img src={logoUrl} alt={brand} className="h-8" /> : <span style={{ color: "var(--lp-primary)" }}>◣◣</span>}
          <span>{brand}</span>
        </a>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {navLinks.map((n, i) => <a key={i} href={n.href} className="hover:opacity-80">{n.label}</a>)}
        </nav>
        {ctaLabel && (
          <a href={ctaHref || "#apply-card"} className="lp-btn-primary rounded-md px-4 py-2 text-sm font-semibold">{ctaLabel}</a>
        )}
      </div>
    </header>
  );
}
