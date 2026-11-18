import * as webpush from "web-push";
import { z } from "zod";
import { db } from "@carebora/db";
import { ApiError } from "@carebora/shared";

// Never let a submitted endpoint turn the notification sender into an HTTP proxy.
const HOSTS = new Set(["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"]);
export const browserSubscriptionSchema = z.object({
  endpoint: z.string().url().max(1500).refine((value) => {
    const url = new URL(value);
    const trusted = HOSTS.has(url.hostname) || url.hostname.endsWith(".notify.windows.com");
    return url.protocol === "https:" && trusted && !url.port && !url.username && !url.password && !url.hash;
  }, "Unsupported browser push endpoint"),
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}=?$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/),
  }),
});

export const webPushService = {
  publicKey() { return process.env.VAPID_PUBLIC_KEY ?? null; },

  async register(userId: string, raw: unknown) {
    const token = JSON.stringify(browserSubscriptionSchema.parse(raw));
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      throw new ApiError("SERVICE_UNAVAILABLE", "Browser notifications are not configured yet.");
    }
    // PushDevice already supports multiple platforms. A normalized browser
    // subscription moves between accounts just like an Expo device token.
    await db.pushDevice.upsert({ where: { token }, create: { userId, token, platform: "web" }, update: { userId, platform: "web" } });
    return { registered: true as const };
  },

  async unregister(userId: string, raw: unknown) {
    const token = JSON.stringify(browserSubscriptionSchema.parse(raw));
    await db.pushDevice.deleteMany({ where: { userId, token, platform: "web" } });
    return { unregistered: true as const };
  },

  async sendToUser(userId: string, input: { id: string; link?: string | null }, send = webpush.sendNotification) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) return;
    try {
      const devices = await db.pushDevice.findMany({ where: { userId, platform: "web" }, select: { id: true, token: true } });
      await Promise.all(devices.map(async (device) => {
        try {
          const subscription = browserSubscriptionSchema.parse(JSON.parse(device.token));
          await send(subscription, JSON.stringify({
            userId, id: input.id, title: "Care Bora", body: "You have a new notification. Open your portal to see the details.",
            link: input.link ?? "/appointments", createdAt: new Date().toISOString(),
          }), { TTL: 900, urgency: "high", timeout: 8000, vapidDetails: { subject: "mailto:customercare@carebora.co.ke", publicKey, privateKey } });
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await db.pushDevice.deleteMany({ where: { id: device.id, userId } });
          else console.error("[web-push] Delivery failed", status ?? "network or invalid subscription");
        }
      }));
    } catch { console.error("[web-push] Could not load browser subscriptions"); }
  },
};
