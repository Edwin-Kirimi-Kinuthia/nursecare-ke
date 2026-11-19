import { db } from "@carebora/db";
import { backgrounded } from "../lib/background";
import { pushService } from "./push.service";
import { webPushService } from "./web-push.service";
import { createHash } from "node:crypto";

function eventId(userId: string, eventKey: string) {
  const h = createHash("sha256").update(`${userId}:${eventKey}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

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
  async create(userId: string, input: { type: string; title: string; body?: string; link?: string; eventKey?: string }) {
    try {
      const created = await db.notification.create({
        data: { ...(input.eventKey ? { id: eventId(userId, input.eventKey) } : {}), userId, type: input.type, title: input.title, body: input.body ?? null, link: input.link ?? null },
      });
      await Promise.all([
        pushService.sendToUser(userId, { title: input.title, link: input.link }),
        webPushService.sendToUser(userId, { id: created.id, link: input.link }),
      ]);
      return created;
    } catch {
      return null;
    }
  },

  /** Fan out service requests to active admins, independent of WhatsApp settings. */
  async serviceRequested(kind: string, reference: string) {
    try {
      const admins = await db.user.findMany({ where: { role: "admin", isActive: true, deletedAt: null }, select: { id: true } });
      await Promise.all(admins.map(({ id }) => inAppNotifications.create(id, {
        type: "service_requested", title: "New service request",
        body: `A customer requested ${kind}. Open the admin portal to review it.`,
        link: "/admin", eventKey: `service:${kind}:${reference}`,
      })));
    } catch { console.error("[notifications] Could not notify administrators"); }
  },

  /** Let each pharmacy's active team know a new order is in their queue. */
  async pharmacyOrderRequested(orgId: string, reference: string) {
    try {
      const members = await db.orgMember.findMany({
        where: { orgId, isActive: true, user: { role: "vendor", isActive: true, deletedAt: null } },
        select: { userId: true },
      });
      await Promise.all(members.map(({ userId }) => inAppNotifications.create(userId, {
        type: "pharmacy_order_requested", title: "New pharmacy order",
        body: "A customer placed an order with your pharmacy. Open Orders in your vendor portal to review it.",
        link: "/vendor", eventKey: `pharmacy:${orgId}:${reference}`,
      })));
    } catch { console.error("[notifications] Could not notify pharmacy team"); }
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
