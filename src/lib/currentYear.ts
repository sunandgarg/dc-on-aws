/** Returns the current calendar year as a string. Centralized so all
 * year mentions (titles, SEO, banners, prompts) auto-roll over. */
export const currentYear = (): number => new Date().getFullYear();
export const currentYearStr = (): string => String(currentYear());
export const nextYear = (): number => currentYear() + 1;
