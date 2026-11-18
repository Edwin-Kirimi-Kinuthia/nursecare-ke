import { randomUUID, randomBytes, createECDH } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test, expect } from "@playwright/test";
import { db } from "@carebora/db";
import { signAccessToken } from "@carebora/core";
import { inAppNotifications, webPushService } from "@carebora/core";

// The headless-shell binary does not support system notification delivery.
test.use({ channel: "chromium" });

test.describe("Browser subscription ownership", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!process.env.VAPID_PUBLIC_KEY, "Requires browser push configuration");
  const users: string[] = [];
  const tokens: string[] = [];
  const ec = createECDH("prime256v1"); ec.generateKeys();
  const subscription = { endpoint: `https://fcm.googleapis.com/fcm/send/e2e-${randomUUID()}`, keys: { p256dh: ec.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } };
  const headers = (index: number) => ({ Authorization: `Bearer ${tokens[index]}` });

  test.beforeAll(async () => {
    if (!["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error("Browser alert fixtures require a local disposable database");
    for (let i = 0; i < 2; i++) {
      const user = await db.user.create({ data: { email: `push-${randomUUID()}@carebora.test`, fullName: "Browser Push Fixture", role: "patient" } });
      users.push(user.id); tokens.push(await signAccessToken({ sub: user.id, role: "patient" }));
    }
  });
  test.afterAll(async () => { await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect(); });

  test("requires authentication, binds only the signed-in account and rejects arbitrary URLs", async ({ request }) => {
    expect((await request.get("/api/v1/push/browser", { headers: { Cookie: "" } })).status()).toBe(401);
    expect((await request.get("/api/v1/push/browser", { headers: headers(0) })).status()).toBe(200);
    expect((await request.post("/api/v1/push/browser", { headers: headers(0), data: { userId: users[1], subscription } })).status()).toBe(409);
    for (const endpoint of ["https://127.0.0.1/private", "http://fcm.googleapis.com/test", "https://fcm.googleapis.com.evil.test/push", "https://user:pass@fcm.googleapis.com/push", "https://fcm.googleapis.com:8443/push"]) {
      expect((await request.post("/api/v1/push/browser", { headers: headers(0), data: { userId: users[0], subscription: { ...subscription, endpoint } } })).status()).toBe(422);
    }
  });

  test("deduplicates devices, transfers ownership and cannot unregister another account's device", async ({ request }) => {
    for (let i = 0; i < 2; i++) expect((await request.post("/api/v1/push/browser", { headers: headers(0), data: { userId: users[0], subscription } })).status()).toBe(201);
    expect(await db.pushDevice.count({ where: { userId: users[0], platform: "web" } })).toBe(1);
    expect((await request.post("/api/v1/push/browser", { headers: headers(1), data: { userId: users[1], subscription } })).status()).toBe(201);
    await request.delete("/api/v1/push/browser", { headers: headers(0), data: { userId: users[0], subscription } });
    expect(await db.pushDevice.count({ where: { userId: users[1], platform: "web" } })).toBe(1);
    await request.delete("/api/v1/push/browser", { headers: headers(1), data: { userId: users[1], subscription } });
    expect(await db.pushDevice.count({ where: { userId: { in: users }, platform: "web" } })).toBe(0);
  });

  test("fan-out separates mobile/browser tokens, hides clinical text and removes expired subscriptions", async () => {
    const token = JSON.stringify(subscription);
    await db.pushDevice.createMany({ data: [
      { userId: users[0]!, token, platform: "web" },
      { userId: users[0]!, token: `ExpoPushToken[test-${randomUUID()}]`, platform: "android" },
    ] });
    const originalFetch = globalThis.fetch;
    const originalSend = webPushService.sendToUser;
    const browser: { data: string; ttl?: number }[] = [];
    const mobile: { to: string; sound: string; body: string }[][] = [];
    try {
      globalThis.fetch = async (_url, init) => {
        mobile.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify({ data: [{ status: "ok" }] }), { status: 200 });
      };
      webPushService.sendToUser = (userId, input) => originalSend(userId, input, async (_subscription, data, options) => {
          browser.push({ data: String(data), ttl: options?.TTL });
          return { statusCode: 201, body: "", headers: {} };
        });
      await inAppNotifications.create(users[0]!, { type: "appointment_confirmed", title: "Appointment confirmed", body: "Private clinical fixture", link: "/appointments" });
      expect(browser).toHaveLength(1); expect(browser[0]!.ttl).toBe(900);
      expect(browser[0]!.data).not.toContain("Private clinical");
      expect(mobile).toHaveLength(1); expect(mobile[0]).toHaveLength(1);
      expect(mobile[0]![0]!.to).toMatch(/^ExpoPushToken/);
      expect(mobile[0]![0]!.sound).toBe("default");
      expect(mobile[0]![0]!.body).not.toContain("Private clinical");
      await originalSend(users[0]!, { id: randomUUID(), link: "/appointments" }, async () => { throw Object.assign(new Error("Expired"), { statusCode: 410 }); });
      expect(await db.pushDevice.count({ where: { userId: users[0], platform: "web" } })).toBe(0);
      expect(await db.pushDevice.count({ where: { userId: users[0], platform: "android" } })).toBe(1);
    } finally {
      globalThis.fetch = originalFetch; webPushService.sendToUser = originalSend;
    }
  });

  test("browser opt-in registers the device, requests a system banner and turns alerts off", async ({ page, baseURL }) => {
    await page.context().grantPermissions(["notifications"], { origin: baseURL! });
    await page.context().addCookies([{ name: "cb_access", value: tokens[0]!, url: baseURL! }]);
    // The push provider's enrollment is stubbed; service worker, notification
    // API, UI, authentication and subscription persistence are real.
    await page.addInitScript((data) => {
      const show = ServiceWorkerRegistration.prototype.showNotification;
      (window as unknown as { testAlerts: string[] }).testAlerts = [];
      ServiceWorkerRegistration.prototype.showNotification = async function (title, options) {
        await show.call(this, title, options);
        (window as unknown as { testAlerts: string[] }).testAlerts.push(title);
      };
      let current: PushSubscription | null = null;
      PushManager.prototype.getSubscription = async () => current;
      PushManager.prototype.subscribe = async () => {
        current = {
          ...data, toJSON: () => data,
          unsubscribe: async () => { current = null; return true; },
        } as unknown as PushSubscription;
        return current;
      };
    }, subscription);
    await page.goto("/");
    await page.getByRole("button", { name: "Notifications", exact: true }).click();
    await page.getByRole("button", { name: "Enable sound and device alerts" }).click();
    const testButton = page.getByRole("button", { name: "Test sound and notification" });
    await expect(testButton).toBeVisible();
    expect(await db.pushDevice.count({ where: { userId: users[0], platform: "web" } })).toBe(1);
    await testButton.click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { testAlerts: string[] }).testAlerts)).toContain("Care Bora notification test");
    await page.getByRole("button", { name: "Turn off", exact: true }).click();
    await expect.poll(() => db.pushDevice.count({ where: { userId: users[0], platform: "web" } })).toBe(0);
  });
});

function worker(userId: string | null, played = false) {
  const handlers: Record<string, (event: unknown) => void> = {};
  const notices: { title: string; options: Record<string, unknown> }[] = [];
  const opened: string[] = [];
  const visible = { focused: true, visibilityState: "visible", postMessage: (_: unknown, ports: MessagePort[]) => { ports[0]!.postMessage(played); } };
  const context = {
    URL, MessageChannel, setTimeout, clearTimeout, Date,
    fetch: async () => ({ ok: Boolean(userId), status: userId ? 200 : 401, json: async () => ({ data: { id: userId } }) }),
    self: {
      location: { origin: "https://app.carebora.co.ke" },
      addEventListener: (type: string, handler: (event: unknown) => void) => { handlers[type] = handler; },
      registration: { showNotification: async (title: string, options: Record<string, unknown>) => { notices.push({ title, options }); } },
      clients: { matchAll: async () => [visible], openWindow: async (url: string) => { opened.push(url); } },
    },
  };
  runInNewContext(readFileSync("public/sw.js", "utf8"), context);
  return {
    notices, opened,
    async push(data: object) {
      let pending: Promise<unknown> | undefined;
      handlers.push!({ data: { json: () => data }, waitUntil: (p: Promise<unknown>) => { pending = p; } });
      await pending;
    },
  };
}

test("worker shows a system alert, uses one sound, and protects shared devices", async () => {
  const data = { id: randomUUID(), userId: "account-a", createdAt: new Date().toISOString(), link: "/appointments", body: "Private clinical content must not appear" };
  const background = worker("account-a"); await background.push(data);
  expect(background.notices).toHaveLength(1);
  expect(background.notices[0]!.options.silent).toBe(false);
  expect(JSON.stringify(background.notices)).not.toContain("Private clinical");
  const foreground = worker("account-a", true); await foreground.push(data);
  expect(foreground.notices[0]!.options.silent).toBe(true);
  for (const userId of [null, "account-b"]) {
    const other = worker(userId); await other.push(data); expect(other.notices).toHaveLength(0);
  }
  const stale = worker("account-a"); await stale.push({ ...data, createdAt: new Date(Date.now() - 901000).toISOString() });
  expect(stale.notices).toHaveLength(0);
});
