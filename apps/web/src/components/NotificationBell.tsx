"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Video, CalendarCheck, BadgeCheck, Bell as BellIcon } from "lucide-react";
import type { AppNotification } from "@carebora/api-client";
import { api, when } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

const ICONS: Record<string, typeof Bell> = {
  consultation_started: Video,
  appointment_confirmed: CalendarCheck,
  appointment_requested: BadgeCheck,
};

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const d = await api.listNotifications();
      setItems(d.notifications);
      setUnread(d.unreadCount);
    } catch { /* ignore */ }
  }

  // Poll while logged in so "join now" arrives without a refresh.
  useEffect(() => {
    if (!user) {
      queueMicrotask(() => { setItems([]); setUnread(0); });
      return;
    }
    queueMicrotask(() => { load(); });
    const iv = setInterval(load, 20_000);
    return () => clearInterval(iv);
  }, [user]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && ref.current?.contains(document.activeElement)) {
        setOpen(false);
        ref.current.querySelector("button")?.focus();
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, []);

  if (!user) return null;

  async function openItem(n: AppNotification) {
    setOpen(false);
    if (!n.readAt) {
      setUnread((u) => Math.max(0, u - 1));
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      try { await api.markNotificationRead(n.id); } catch { /* ignore */ }
    }
    if (n.link) router.push(n.link);
  }

  async function markAll() {
    setUnread(0);
    setItems((list) => list.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    try { await api.markAllNotificationsRead(); } catch { /* ignore */ }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        className="icon-button relative"
        aria-label="Notifications"
        aria-expanded={open}
        aria-controls="notifications-panel"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div id="notifications-panel" className="fixed left-4 right-4 top-[4.5rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-bold text-slate-900">Notifications</span>
            {unread > 0 && <button onClick={markAll} className="text-xs font-medium text-teal-700 hover:underline">Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">No notifications yet.</p>
            ) : (
              items.map((n) => {
                const Icon = ICONS[n.type] ?? BellIcon;
                return (
                  <button
                    key={n.id}
                    onClick={() => openItem(n)}
                    className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${!n.readAt ? "bg-teal-50/50" : ""}`}
                  >
                    <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${!n.readAt ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-400"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800">{n.title}</span>
                      {n.body && <span className="mt-0.5 block text-xs text-slate-500">{n.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-slate-400">{when(n.createdAt)}</span>
                    </span>
                    {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
