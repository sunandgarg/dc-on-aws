export const normalizeIndianMobile = (raw: string): string => {
  let digits = String(raw || "").replace(/\D/g, "");
  while (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.startsWith("91") && digits.length > 10) digits = digits.slice(2);
  while (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
};

export const normalizeIndianMobileForSave = (raw: string): string => normalizeIndianMobile(raw);

export const isValidIndianMobile = (raw: string): boolean => /^\d{10}$/.test(normalizeIndianMobile(raw));

export const isStrictIndianMobile = (raw: string): boolean => isValidIndianMobile(raw);