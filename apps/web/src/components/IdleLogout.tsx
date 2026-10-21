"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

/** Sign out after this long with no mouse, keyboard, touch or scroll activity. */
export const IDLE_LIMIT_MS = 20 * 60 * 1000;
const KEY = "cb_last_activity";
const EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click", "wheel"] as const;

const read = () => { try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; } };
const write = (t: number) => { try { localStorage.setItem(KEY, String(t)); } catch { /* private mode: the in-memory copy still works */ } };

/**
 * Signs the person out after 20 minutes of inactivity, whether the tab stays
 * open or was closed and reopened later. The timestamp lives in localStorage so
 * every tab shares it: activity in one keeps all of them signed in.
 * A video consultation counts as activity (nobody types during a call).
 */
export default function IdleLogout() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const inCall = pathname.startsWith("/consultations/");
  const inCallRef = useRef(inCall);
  useEffect(() => { inCallRef.current = inCall; }, [inCall]);

  useEffect(() => {
    if (!user) return;
    let last = read() || Date.now();
    // Coming back after being away: if it has been too long, end the session now.
    if (Date.now() - last > IDLE_LIMIT_MS && !inCallRef.current) { void expire(); return; }
    write(Date.now());
    last = Date.now();

    let lastWrite = 0;
    const touch = () => {
      const now = Date.now();
      last = now;
      if (now - lastWrite > 5000) { lastWrite = now; write(now); } // don't hammer localStorage on every mousemove
    };
    EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    async function expire() {
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
      await logout();
      window.location.assign("/login?reason=idle");
    }

    const timer = setInterval(() => {
      if (inCallRef.current) { touch(); return; }
      const latest = Math.max(last, read()); // another tab may have been active
      if (Date.now() - latest > IDLE_LIMIT_MS) void expire();
    }, 15_000);

    return () => { clearInterval(timer); EVENTS.forEach((e) => window.removeEventListener(e, touch)); };
  }, [user, logout]);

  return null;
}
