import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

/**
 * useState replacement that persists the value to sessionStorage under `key`.
 * Used across admin pages so unsaved form drafts survive tab switches.
 * When the value is null/undefined the key is removed.
 */
export function useDraftState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw === null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  const first = useRef(true);
  useEffect(() => {
    // Skip the initial sync — the value already reflects storage.
    if (first.current) { first.current = false; return; }
    try {
      if (value === null || value === undefined) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, JSON.stringify(value));
    } catch { /* quota / non-serialisable — ignore */ }
  }, [key, value]);

  return [value, setValue];
}
