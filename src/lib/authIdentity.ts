export const PHONE_AUTH_EMAIL_DOMAIN = "auth.dekhocampus.in";
export const LEGACY_PHONE_AUTH_EMAIL_DOMAIN = "dekhocampus.local";

export function phoneAuthEmail(phoneDigits: string) {
  return `phone${phoneDigits}@${PHONE_AUTH_EMAIL_DOMAIN}`;
}

export function phoneAuthPassword(phoneDigits: string) {
  return `dc!${phoneDigits}!secure2026`;
}

export function isSyntheticPhoneEmail(email = "") {
  const value = String(email).toLowerCase();
  return value.endsWith(`@${PHONE_AUTH_EMAIL_DOMAIN}`) || value.endsWith(`@${LEGACY_PHONE_AUTH_EMAIL_DOMAIN}`);
}
