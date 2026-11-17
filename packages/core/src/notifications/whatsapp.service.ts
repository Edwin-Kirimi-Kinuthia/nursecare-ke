import { db, Prisma } from "@carebora/db";
import { ApiError, normalizeWhatsAppPhone, whatsAppPhoneSchema, type WhatsAppPreferenceInput } from "@carebora/shared";
import { backgrounded } from "../lib/background";
import { sendWhatsAppTemplate, whatsAppConfig, WhatsAppSendError, type WhatsAppTemplate } from "./whatsapp-gateway";
import { z } from "zod";

const base = () => (process.env.NEXT_PUBLIC_APP_URL || "https://app.carebora.co.ke").replace(/\/$/, "");
const slotTime = (date: Date) => new Intl.DateTimeFormat("en-KE", {
  timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "short",
}).format(date) + " EAT";
const mask = (phone: string) => `${phone.slice(0, 4)}…${phone.slice(-4)}`;

async function enqueue(input: {
  eventKey: string; toPhone: string; recipientUserId?: string;
  templateKey: WhatsAppTemplate; parameters: string[]; ttlMinutes?: number;
}) {
  if (!whatsAppConfig().enabled) return;
  if (await db.whatsAppOptOut.findUnique({ where: { phoneNumber: input.toPhone } })) return;
  try {
    const message = await db.whatsAppMessage.create({
      data: {
        eventKey: `${input.eventKey}:${input.toPhone}`, toPhone: input.toPhone,
        recipientUserId: input.recipientUserId, templateKey: input.templateKey, parameters: input.parameters,
        expiresAt: new Date(Date.now() + (input.ttlMinutes ?? 1440) * 60_000),
      },
    });
    await dispatch(message.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }
}

async function client(userId: string, input: Omit<Parameters<typeof enqueue>[0], "toPhone" | "recipientUserId">) {
  const preference = await db.whatsAppPreference.findUnique({ where: { userId }, include: { user: { select: { isActive: true, deletedAt: true } } } });
  if (!preference?.enabled || !preference.phoneNumber || !preference.user.isActive || preference.user.deletedAt) return;
  await enqueue({ ...input, toPhone: preference.phoneNumber, recipientUserId: userId });
}

async function admin(eventKey: string, label: string, reference: string) {
  await Promise.all(whatsAppConfig().adminNumbers.map((toPhone) => enqueue({
    eventKey, toPhone, templateKey: "admin_activity", parameters: [label, reference.slice(0, 8), `${base()}/admin`],
  })));
}

async function dispatch(id: string) {
  if (!whatsAppConfig().enabled) return;
  const now = new Date();
  const claimed = await db.whatsAppMessage.updateMany({
    where: { id, status: "pending", availableAt: { lte: now }, expiresAt: { gt: now }, attempts: { lt: 3 } },
    data: { status: "sending", attempts: { increment: 1 }, errorCode: null },
  });
  if (!claimed.count) return;
  const message = await db.whatsAppMessage.findUniqueOrThrow({ where: { id } });
  const optedOut = await db.whatsAppOptOut.findUnique({ where: { phoneNumber: message.toPhone } });
  const preference = message.recipientUserId ? await db.whatsAppPreference.findUnique({
    where: { userId: message.recipientUserId }, include: { user: { select: { isActive: true, deletedAt: true } } },
  }) : null;
  // Do not retry a join/confirmation alert after the session or booking changed.
  const [kind, subjectId, run] = message.eventKey.split(":");
  let stale = false;
  if (kind === "ready") {
    const current = await db.consultation.findUnique({ where: { id: subjectId }, select: { status: true, meetingRun: true, appointment: { select: { status: true } } } });
    stale = !current || current.status === "ended" || current.meetingRun !== Number(run) || current.appointment.status !== "confirmed";
  } else if (kind === "confirmed" || kind === "invited") {
    const current = await db.appointment.findUnique({ where: { id: subjectId }, select: { status: true } });
    stale = current?.status !== "confirmed";
  }
  if (stale || optedOut || (message.recipientUserId && (!preference?.enabled || preference.phoneNumber !== message.toPhone || !preference.user.isActive || preference.user.deletedAt))) {
    await db.whatsAppMessage.update({ where: { id }, data: { status: "cancelled" } });
    return;
  }
  try {
    const providerMessageId = await sendWhatsAppTemplate({
      ...message, templateKey: message.templateKey as WhatsAppTemplate, parameters: message.parameters as string[],
    });
    // A delivery webhook can arrive before the HTTP send response.
    await db.whatsAppMessage.updateMany({ where: { id, status: "sending" }, data: { status: "accepted", providerMessageId } });
  } catch (error) {
    const failure = error instanceof WhatsAppSendError ? error : new WhatsAppSendError("internal_error");
    const retry = failure.retryable && message.attempts < 3;
    await db.whatsAppMessage.updateMany({
      where: { id, status: "sending" },
      data: {
        status: failure.uncertain ? "unknown" : retry ? "pending" : "failed", errorCode: failure.code,
        availableAt: new Date(Date.now() + message.attempts * 60_000),
      },
    });
  }
}

/** Event failures must not roll back a registration, booking or client message. */
async function bestEffort(work: () => Promise<unknown>) {
  if (!whatsAppConfig().enabled) return;
  try { await work(); } catch { console.error("[whatsapp] Could not queue notification"); }
}

export const whatsAppEvents = backgrounded({
  registered(userId: string) {
    return bestEffort(() => admin(`registered:${userId}`, "New client registered", userId));
  },
  booked(appointmentId: string) {
    return bestEffort(() => admin(`booked:${appointmentId}`, "New client booking", appointmentId));
  },
  contact(ticketId: string, messageId?: string) {
    return bestEffort(() => admin(`contact:${messageId ?? ticketId}`, messageId ? "Client replied on website" : "New website enquiry", ticketId));
  },
  confirmed(appointment: { id: string; patientId: string; feeKes: number; paymentWaived: boolean; slot: { startsAt: Date } }) {
    return bestEffort(() => client(appointment.patientId, {
      eventKey: `confirmed:${appointment.id}`, templateKey: "appointment_confirmed",
      parameters: [slotTime(appointment.slot.startsAt), appointment.paymentWaived ? "No payment is required for this provider invitation." : `Pay KES ${appointment.feeKes.toLocaleString("en-KE")} in your account before joining.`, `${base()}/appointments`],
    }));
  },
  invited(appointment: { id: string; patientId: string; slot: { startsAt: Date } }) {
    return bestEffort(() => client(appointment.patientId, {
      eventKey: `invited:${appointment.id}`, templateKey: "provider_invitation",
      parameters: [slotTime(appointment.slot.startsAt), `${base()}/appointments`],
    }));
  },
  ready(consultation: { id: string; meetingRun: number; appointment: { patientId: string } }) {
    return bestEffort(() => client(consultation.appointment.patientId, {
      eventKey: `ready:${consultation.id}:${consultation.meetingRun}`, templateKey: "provider_ready", ttlMinutes: 15,
      parameters: [`${base()}/consultations/${consultation.id}`],
    }));
  },
  supportReply(userId: string, messageId: string) {
    return bestEffort(() => client(userId, {
      eventKey: `support-reply:${messageId}`, templateKey: "support_reply", parameters: [`${base()}/contact`],
    }));
  },
});

export const whatsAppService = {
  async preferences(userId: string) {
    const [preference, user] = await Promise.all([
      db.whatsAppPreference.findUnique({ where: { userId } }),
      db.user.findUniqueOrThrow({ where: { id: userId }, select: { phone: true } }),
    ]);
    const phoneNumber = preference?.phoneNumber ?? (user.phone ? normalizeWhatsAppPhone(user.phone) : "");
    const suppressed = !!phoneNumber && !!await db.whatsAppOptOut.findUnique({ where: { phoneNumber } });
    return { enabled: !!preference?.enabled, phoneNumber, suppressed, deliveryAvailable: whatsAppConfig().ready };
  },

  async setPreferences(userId: string, input: WhatsAppPreferenceInput) {
    const current = await this.preferences(userId);
    const phoneNumber = input.phoneNumber ?? current.phoneNumber;
    if (input.enabled && !whatsAppPhoneSchema.safeParse(phoneNumber).success) throw ApiError.badRequest("Add your WhatsApp phone number");
    if (input.enabled && await db.whatsAppOptOut.findUnique({ where: { phoneNumber } })) {
      throw ApiError.badRequest("This number sent STOP. Send START to our WhatsApp business number first, then enable notifications here.");
    }
    await db.$transaction(async (tx) => {
      await tx.whatsAppPreference.upsert({ where: { userId },
        create: { userId, enabled: input.enabled, phoneNumber: phoneNumber || null, consentedAt: input.enabled ? new Date() : null },
        update: { enabled: input.enabled, phoneNumber: phoneNumber || null, ...(input.enabled ? { consentedAt: new Date() } : {}) },
      });
      await tx.whatsAppMessage.updateMany({ where: { recipientUserId: userId, status: "pending" }, data: { status: "cancelled" } });
    });
    return this.preferences(userId);
  },

  async processQueue() {
    if (!whatsAppConfig().ready) return { processed: 0 };
    // Interrupted sends are ambiguous; do not automatically duplicate them.
    await db.whatsAppMessage.updateMany({ where: { status: "sending", updatedAt: { lt: new Date(Date.now() - 5 * 60_000) } }, data: { status: "unknown", errorCode: "interrupted_send" } });
    await db.whatsAppMessage.updateMany({ where: { status: { in: ["pending", "failed"] }, expiresAt: { lte: new Date() } }, data: { status: "expired" } });
    const messages = await db.whatsAppMessage.findMany({ where: { status: "pending", availableAt: { lte: new Date() }, expiresAt: { gt: new Date() }, attempts: { lt: 3 } }, take: 10, orderBy: { createdAt: "asc" } });
    await Promise.all(messages.map((m) => dispatch(m.id)));
    return { processed: messages.length };
  },

  async retryFailed() {
    if (!whatsAppConfig().ready) throw ApiError.badRequest("Configure and enable the WhatsApp Business connection first");
    await db.whatsAppMessage.updateMany({ where: { status: "failed", attempts: { lt: 3 }, expiresAt: { gt: new Date() } }, data: { status: "pending", availableAt: new Date() } });
    return this.processQueue();
  },

  async adminStatus() {
    const config = whatsAppConfig();
    const [counts, recent] = await Promise.all([
      db.whatsAppMessage.groupBy({ by: ["status"], _count: true }),
      db.whatsAppMessage.findMany({ take: 30, orderBy: { createdAt: "desc" }, select: { id: true, toPhone: true, templateKey: true, status: true, errorCode: true, attempts: true, createdAt: true } }),
    ]);
    return { ...config, adminNumbers: config.adminNumbers.map(mask), counts: Object.fromEntries(counts.map((r) => [r.status, r._count])), recent: recent.map((m) => ({ ...m, toPhone: mask(m.toPhone) })) };
  },
};

// Only the signed webhook route may call this. zod validates the untrusted payload.
const webhookSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(z.object({ changes: z.array(z.object({ field: z.string(), value: z.object({
    metadata: z.object({ phone_number_id: z.string() }).optional(),
    statuses: z.array(z.object({ id: z.string(), recipient_id: z.string().optional(), status: z.string(), biz_opaque_callback_data: z.string().optional(), errors: z.array(z.object({ code: z.number() })).optional() })).optional(),
    messages: z.array(z.object({ from: z.string().optional(), type: z.string(), text: z.object({ body: z.string() }).optional() })).optional(),
  }) })) })),
});

export async function handleWhatsAppWebhook(payload: unknown) {
  const parsed = webhookSchema.safeParse(payload);
  if (!parsed.success) return;
  for (const entry of parsed.data.entry) for (const change of entry.changes) {
    if (change.field !== "messages" || change.value.metadata?.phone_number_id !== process.env.WHATSAPP_PHONE_NUMBER_ID) continue;
    for (const status of change.value.statuses ?? []) {
      const allowedPrevious: Record<string, string[]> = {
        sent: ["sending", "accepted", "unknown"],
        delivered: ["sending", "accepted", "unknown", "sent", "failed"],
        read: ["sending", "accepted", "unknown", "sent", "delivered", "failed"],
        failed: ["sending", "accepted", "unknown", "sent"],
      };
      if (!allowedPrevious[status.status]) continue;
      const message = await db.whatsAppMessage.findFirst({ where: { OR: [
        { providerMessageId: status.id },
        ...(z.string().uuid().safeParse(status.biz_opaque_callback_data).success ? [{ id: status.biz_opaque_callback_data! }] : []),
      ] } });
      if (!message || (status.recipient_id && normalizeWhatsAppPhone(`+${status.recipient_id}`) !== message.toPhone)) continue;
      await db.whatsAppMessage.updateMany({ where: { id: message.id, status: { in: allowedPrevious[status.status] } }, data: {
        status: status.status, providerMessageId: status.id,
        errorCode: status.status === "failed" ? `meta_${status.errors?.[0]?.code ?? "delivery_failed"}` : null,
      } });
    }
    for (const message of change.value.messages ?? []) {
      if (message.type !== "text" || !message.from) continue;
      const phone = whatsAppPhoneSchema.safeParse(`+${message.from}`);
      if (!phone.success) continue;
      const command = message.text?.body.trim().toUpperCase();
      if (["STOP", "UNSUBSCRIBE", "CANCEL"].includes(command ?? "")) {
        await db.$transaction([
          db.whatsAppOptOut.upsert({ where: { phoneNumber: phone.data }, create: { phoneNumber: phone.data }, update: {} }),
          db.whatsAppPreference.updateMany({ where: { phoneNumber: phone.data }, data: { enabled: false } }),
          db.whatsAppMessage.updateMany({ where: { toPhone: phone.data, status: "pending" }, data: { status: "cancelled" } }),
        ]);
      } else if (command === "START") {
        // Removing STOP does not opt every account sharing a number back in.
        await db.whatsAppOptOut.deleteMany({ where: { phoneNumber: phone.data } });
      }
    }
  }
}
