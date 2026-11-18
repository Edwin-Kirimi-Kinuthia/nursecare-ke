/* No page or API caching: authenticated clinical data stays out of caches. */
self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let data;
    try { data = event.data.json(); } catch { return; }
    const age = Date.now() - Date.parse(data.createdAt);
    if (!Number.isFinite(age) || age > 900000 || age < -60000) return;
    // A stale subscription must never notify the previous account on a shared device.
    let response = await fetch("/api/v1/auth/me", { credentials: "include", cache: "no-store" });
    if (response.status === 401) {
      const refresh = await fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!refresh.ok) return;
      response = await fetch("/api/v1/auth/me", { credentials: "include", cache: "no-store" });
    }
    if (!response.ok || (await response.json()).data?.id !== data.userId) return;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const visible = windows.find((client) => client.focused && client.visibilityState === "visible");
    let played = false;
    if (visible) {
      played = await new Promise((resolve) => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => { channel.port1.close(); resolve(false); }, 500);
        channel.port1.onmessage = (event) => { clearTimeout(timer); channel.port1.close(); resolve(event.data === true); };
        visible.postMessage({ type: "CAREBORA_ALERT", userId: data.userId }, [channel.port2]);
      });
    }
    await self.registration.showNotification("Care Bora", {
      body: "You have a new notification. Open your portal to see the details.",
      icon: "/icon.png", badge: "/logo-mark.png", tag: data.id,
      silent: played, data: { userId: data.userId, link: data.link },
    });
  })().catch(() => {}));
});

self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data;
  event.notification.close();
  event.waitUntil((async () => {
    const link = typeof data?.link === "string" && data.link.startsWith("/") && !data.link.startsWith("//") ? data.link : "/appointments";
    const url = new URL(link, self.location.origin);
    if (url.origin !== self.location.origin) return;
    const windows = await self.clients.matchAll({ type: "window" });
    if (windows[0]) { await windows[0].navigate(url.href); await windows[0].focus(); }
    else await self.clients.openWindow(url.href);
  })());
});
