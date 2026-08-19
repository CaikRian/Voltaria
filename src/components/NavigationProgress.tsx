"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const next = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      const isInternalNavigation =
        next.origin === current.origin &&
        `${next.pathname}${next.search}` !== `${current.pathname}${current.search}`;

      if (isInternalNavigation) setLoading(true);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const safetyTimeout = window.setTimeout(() => setLoading(false), 10_000);
    return () => window.clearTimeout(safetyTimeout);
  }, [loading]);

  if (!loading) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-brand-soft" role="progressbar" aria-label="Carregando página">
      <span className="block h-full w-1/3 bg-brand shadow-[0_0_14px_rgba(161,0,255,0.85)] motion-safe:animate-[navigation-progress_1s_ease-in-out_infinite]" />
    </div>
  );
}
