import { db } from "@carebora/db";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Expo accepts at most 100 messages in one request. */
const BATCH = 100;

const TOKEN_RE = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/;
export const isExpoPushToken = (t: string) => TOKEN_RE.test(t);

type Ticket = { status: "ok" | "error"; message?: string; details?: { error?: string } };

/**
 * Push notifications to the mobile app, through Expo's push service (which
 * fans out to Apple's and Google's).
 *
 * What goes on the lock screen is deliberately minimal: the *title* of the
 * in-app notification ("Appointment confirmed") and a fixed prompt to open the
 * app, never the body. A body can carry a patient's name or the nature of a
 * request, and a lock screen is readable by whoever is standing next to the
 * phone. The detail is one tap away inside the signed-in app.
 *
 * Nothing here ever throws into the caller: a failed push must not fail the
 * booking that triggered it.
 */
export const pushService = {
  async register(userId: string, token: string, platform: "ios" | "android") {
    // The token is unique. If it was last used by someone else (a different
    // person signed in on the same handset) it moves to this user, so the
    // previous person's notifications stop arriving here.
    await db.pushDevice.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
    });
    return { registered: true as const };
  },

  async unregister(userId: string, token: string) {
    await db.pushDevice.deleteMany({ where: { userId, token } });
    return { unregistered: true as const };
  },

  async sendToUser(userId: string, notification: { title: string; link?: string | null }) {
    try {
      const devices = await db.pushDevice.findMany({ where: { userId }, select: { token: true } });
      if (devices.length === 0) return;

      const messages = devices.map((d) => ({
        to: d.token,
        title: notification.title,
        body: "Open Care Bora to see the details.",
        sound: "default",
        priority: "high",
        channelId: "default",
        data: { link: notification.link ?? null },
      }));

      const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
      // Optional "enhanced push security": once enabled in the Expo dashboard,
      // a leaked token is useless without this.
      if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

      for (let i = 0; i < messages.length; i += BATCH) {
        const chunk = messages.slice(i, i + BATCH);
        const res = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(chunk),
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) {
          console.error("[push] Expo rejected the request", res.status);
          continue;
        }
        const { data } = (await res.json()) as { data?: Ticket[] };

        // A device that uninstalled the app or revoked permission comes back
        // DeviceNotRegistered; keep sending to it and Expo may throttle us.
        const dead = (data ?? [])
          .map((t, idx) => (t.status === "error" && t.details?.error === "DeviceNotRegistered" ? chunk[idx]!.to : null))
          .filter((t): t is string => t !== null);
        if (dead.length) await db.pushDevice.deleteMany({ where: { token: { in: dead } } });
      }
    } catch (err) {
      console.error("[push] send failed", err instanceof Error ? err.message : err);
    }
  },
};
