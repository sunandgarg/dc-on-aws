
-- Append Google Ads disclosures to existing legal pages
UPDATE public.legal_pages
SET content = content || $$

<h2>Advertising & Third-Party Vendors</h2>
<p>This website is supported in part by advertising. We use <strong>Google AdSense</strong> and may use other third-party ad networks to display advertisements.</p>

<h3>How Google uses your data</h3>
<ul>
  <li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website and other websites on the Internet.</li>
  <li>Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our site and/or other sites on the Internet.</li>
  <li>Users may opt out of personalised advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener">Google Ads Settings</a>.</li>
  <li>Users may also opt out of a third-party vendor's use of cookies for personalised advertising by visiting <a href="https://www.aboutads.info/" target="_blank" rel="noopener">aboutads.info</a> or, for EEA/UK users, <a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener">youronlinechoices.eu</a>.</li>
</ul>

<h3>Information collected by ad partners</h3>
<p>Third-party advertising partners may collect information such as your IP address, device identifiers, browser type, pages visited, time of visit, and approximate location to serve relevant ads, measure ad performance, and prevent fraud.</p>

<h3>EEA, UK and California users</h3>
<p>We honour the IAB Transparency & Consent Framework (TCF) and Google's Additional Consent. EEA, UK and California residents may withdraw consent for personalised advertising at any time via our cookie banner ("Cookie Preferences" link in the footer). When consent is withdrawn, non-personalised ads may still be shown.</p>

<h3>Children</h3>
<p>This site is not directed at children under 13 (or 16 in the EEA). We do not knowingly collect personal data from children for advertising purposes.</p>
$$
WHERE slug = 'privacy-policy';

UPDATE public.legal_pages
SET content = content || $$

<h2>Advertising Cookies (Google AdSense)</h2>
<p>We use <strong>Google AdSense</strong>, a third-party advertising service, which may set cookies on your device to deliver and measure advertisements.</p>
<ul>
  <li><strong>__gads / __gpi</strong> – set by Google to measure ad performance and frequency capping.</li>
  <li><strong>IDE, NID, ANID</strong> – set by Google to personalise ads based on your interests and browsing history.</li>
  <li><strong>FPID, FPLC</strong> – first-party identifiers used by Google Tag for analytics and ads measurement.</li>
</ul>

<h3>Managing advertising cookies</h3>
<ul>
  <li>Click "Cookie Preferences" in the footer to change your consent at any time.</li>
  <li>EEA/UK visitors: we request consent via a TCF v2.2-compliant Consent Management Platform before any advertising cookies are set. You can decline non-essential cookies and still browse the site (non-personalised ads will be shown).</li>
  <li>Opt out of Google personalised ads: <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener">google.com/settings/ads</a></li>
  <li>Opt out of third-party vendor cookies: <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener">aboutads.info/choices</a> (US) · <a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener">youronlinechoices.eu</a> (EEA/UK)</li>
  <li>For more information on how Google uses cookies in advertising, see <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener">policies.google.com/technologies/ads</a>.</li>
</ul>
$$
WHERE slug = 'cookie-policy';

UPDATE public.legal_pages
SET content = content || $$

<h2>Advertising</h2>
<p>Portions of this website display advertisements served by <strong>Google AdSense</strong> and other third-party ad networks. We do not endorse, guarantee, or assume responsibility for any products, services or content advertised. Any transaction you enter into with an advertiser is solely between you and that advertiser.</p>
<p>We reserve the right to display or remove ads at our sole discretion and to refuse advertisements that violate our editorial or community standards. Users must not engage in invalid click activity (clicking on ads in a manner intended to generate artificial impressions or revenue); such activity may result in account termination.</p>
$$
WHERE slug = 'terms-of-service';

-- Create Contact Us legal page (idempotent)
INSERT INTO public.legal_pages (slug, title, meta_title, meta_description, is_active, content)
VALUES (
  'contact-us',
  'Contact Us',
  'Contact Us | DekhoCampus',
  'Get in touch with DekhoCampus for support, advertising, privacy or partnership enquiries.',
  true,
  $$
<p>We'd love to hear from you. Use the appropriate contact below for the fastest response.</p>

<h2>General Support</h2>
<p>Email: <a href="mailto:support@dekhocampus.com">support@dekhocampus.com</a></p>

<h2>Privacy & Data Requests</h2>
<p>For privacy questions, data access/deletion requests, or GDPR/CCPA enquiries:</p>
<p>Email: <a href="mailto:privacy@dekhocampus.com">privacy@dekhocampus.com</a></p>

<h2>Advertising Enquiries</h2>
<p>For ad partnerships, sponsored content, or questions about advertisements appearing on this site (including Google AdSense):</p>
<p>Email: <a href="mailto:ads@dekhocampus.com">ads@dekhocampus.com</a></p>

<h2>Postal Address</h2>
<p>DekhoCampus<br/>India</p>

<p class="text-sm opacity-70 mt-6">We typically respond within 2 business days.</p>
$$
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  is_active = true,
  content = EXCLUDED.content;
