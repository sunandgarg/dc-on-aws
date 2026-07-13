import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

declare const __APP_BUILD_ID__: string;

const CHECK_INTERVAL_MS = 60_000;

/**
 * Detects a deployment without reloading the page that is currently open.
 * Once an update exists, the next internal navigation becomes a normal full
 * document request. This keeps forms, uploads and AI runs uninterrupted while
 * ensuring the destination uses the newest HTML and chunk manifest.
 */
export function DeploymentUpdateCoordinator() {
  const location = useLocation();
  const initialLocation = useRef(`${location.pathname}${location.search}${location.hash}`);
  const [updatePending, setUpdatePending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!response.ok) return;
        const version = await response.json();
        if (!cancelled && version?.buildId && version.buildId !== __APP_BUILD_ID__) {
          setUpdatePending(true);
        }
      } catch {
        // Being offline or a transient version check failure must never affect
        // the page the user is currently working on.
      }
    };

    void check();
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!updatePending) return;
    const current = `${location.pathname}${location.search}${location.hash}`;
    if (current !== initialLocation.current) window.location.replace(current);
  }, [location, updatePending]);

  useEffect(() => {
    if (!updatePending) return;

    const navigateWithNewBuild = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const target = new URL(anchor.href, window.location.href);
      if (target.origin !== window.location.origin) return;
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(target.href);
    };

    document.addEventListener("click", navigateWithNewBuild, true);
    return () => document.removeEventListener("click", navigateWithNewBuild, true);
  }, [updatePending]);

  return null;
}
