"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { COOKIE_PREFERENCES_KEY } from "@/components/CookiePreferences";

const VISITOR_KEY = "heca-store-anonymous-visitor-v1";
const SESSION_KEY = "heca-store-analytics-session-v1";
type ActiveVisit = { id: string; startedAt: number };
function consented() { try { return !!JSON.parse(localStorage.getItem(COOKIE_PREFERENCES_KEY) ?? "null")?.analytics; } catch { return false; } }
function identifier(storage: Storage, key: string) { let value = storage.getItem(key); if (!value) { value = crypto.randomUUID(); storage.setItem(key, value); } return value; }
function device() { const width = window.innerWidth; return width < 768 ? "Celular" : width < 1100 ? "Tablet" : "Desktop"; }
function browser() { const ua = navigator.userAgent; return /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Outro"; }
function referrerHost() { try { const host = document.referrer ? new URL(document.referrer).hostname : ""; return host === location.hostname ? "Direto / interno" : host; } catch { return ""; } }

export function WebAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = useRef<ActiveVisit | null>(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => { const value = consented(); setAllowed(value); if (!value) localStorage.removeItem(VISITOR_KEY); };
    sync(); window.addEventListener("heca-store:cookie-preferences", sync); return () => window.removeEventListener("heca-store:cookie-preferences", sync);
  }, []);

  useEffect(() => {
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    function finish() {
      if (heartbeat) clearInterval(heartbeat);
      if (!active.current) return;
      const payload = JSON.stringify({ type: "end", id: active.current.id, durationMs: Date.now() - active.current.startedAt });
      navigator.sendBeacon?.("/api/analytics/visit", new Blob([payload], { type: "text/plain" }));
      active.current = null;
    }
    if (!allowed || pathname.startsWith("/painel")) { finish(); return; }
    finish();
    const visit = { id: crypto.randomUUID(), startedAt: Date.now() };
    active.current = visit;
    void fetch("/api/analytics/visit", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ type: "start", id: visit.id, visitorId: identifier(localStorage, VISITOR_KEY), sessionId: identifier(sessionStorage, SESSION_KEY), path: pathname, referrerHost: referrerHost(), utmSource: searchParams.get("utm_source")?.slice(0, 80) ?? "", device: device(), browser: browser() }) });
    heartbeat = setInterval(() => {
      if (!active.current || document.visibilityState === "hidden") return;
      void fetch("/api/analytics/visit", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ type: "ping", id: active.current.id }) });
    }, 20_000);
    window.addEventListener("pagehide", finish);
    return () => { finish(); window.removeEventListener("pagehide", finish); };
  }, [allowed, pathname, searchParams]);
  return null;
}
