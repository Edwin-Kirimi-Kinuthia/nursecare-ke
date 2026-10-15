import { db } from "@carebora/db";
import { backgrounded } from "../lib/background";
import { pushService } from "./push.service";

/**
 * In-app notifications (the bell feed). Creation is best-effort and never throws
 * into the calling domain flow.
 */
export const inAppNotifications = backgrounded({
  /**
   * Record a notification for the bell feed, and push it to the person's
   * phones. Every notification the app already creates (a booking, a
   * confirmation, "your doctor has started the call") therefore reaches the
   * mobile app with no change at the call sites.
   */
  async create(userId: string, input: { type: string; title: string; body?: string; link?: string }) {
    try {
      const created = await db.notification.create({
        data: { userId, type: input.type, title: input.title, body: input.body ?? null, link: input.link ?? null },
      });
      await pushService.sendToUser(userId, { title: input.title, link: input.link });
      return created;
    } catch {
      return null;
    }
  },

  async list(userId: string, limit = 30) {
    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit }),
      db.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { notifications, unreadCount };
  },

  async markRead(userId: string, id: string) {
    await db.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  },

  async markAllRead(userId: string) {
    const r = await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { ok: true, count: r.count };
  },
});
