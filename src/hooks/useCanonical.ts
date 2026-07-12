import { SITE_URL } from "@/lib/constant";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Sets a canonical URL link tag in <head> based on current route.
 * Removes trailing slashes and query params for clean canonical.
 */
export function useCanonical(baseUrl = SITE_URL) {
  const { pathname } = useLocation();

  useEffect(() => {
    const canonical = `${baseUrl}${pathname.replace(/\/+$/, "") || "/"}`;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonical);

    return () => {
      link?.remove();
    };
  }, [pathname, baseUrl]);
}
