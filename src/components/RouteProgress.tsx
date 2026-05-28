"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

let isConfigured = false;

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isConfigured) return;
    NProgress.configure({
      showSpinner: false,
      trickleSpeed: 140,
      minimum: 0.08,
    });
    isConfigured = true;
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      if (anchor.target === "_blank") return;
      if (anchor.hasAttribute("download")) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      if (href.startsWith("#") || href.startsWith("javascript:")) return;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;

      const current = window.location.pathname + window.location.search;
      const next = url.pathname + url.search;
      if (current === next) return;

      NProgress.start();
    };

    const handlePopState = () => {
      NProgress.start();
    };

    document.addEventListener("click", handleClick);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    NProgress.done(true);
  }, [pathname, searchParams]);

  return null;
}
