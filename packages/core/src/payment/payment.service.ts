import { db } from "@carebora/db";
import { ApiError, type MpesaCallback, type MpesaStkInput, type PaymentsQuery, type UserRole } from "@carebora/shared";
import { initiateStkPush, normaliseMpesaPhone } from "./daraja";
import { PROVIDER_ROLES } from "@carebora/shared";
import { notificationService } from "../notifications/notification.service";

const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? "10");

function extractCallbackMeta(items: { Name: string; Value?: string | number }[]) {
  const get = (name: string) => items.find((i) => i.Name === name)?.Value;
  return {
    receiptNumber: get("MpesaReceiptNumber") as string | undefined,
    amount: get("Amount") as number | undefined,
    phone: get("PhoneNumber") as string | undefined,
  };
}

const PAYMENT_INCLUDE = {
  appointment: {
    select: {
      id: true,
      appointmentType: true,
      status: true,
      slot: { select: { startsAt: true, endsAt: true } },
    },
  },
  patient: { select: { id: true, fullName: true, phone: true } },
  provider: { select: { id: true, fullName: true } },
  ledgerEntries: true,
} as const;

export const paymentService = {
  /** Initiate an M-Pesa STK push for an appointment. */
  async initiateMpesa(patientId: string, input: MpesaStkInput) {
    const appointment = await db.appointment.findUnique({
      where: { id: input.appointmentId },
      include: { payment: true },
    });
    if (!appointment) throw ApiError.notFound("Appointment not found");
    if (appointment.patientId !== patientId) throw ApiError.forbidden();
    if (appointment.status !== "confirmed") {
      throw ApiError.badRequest("Only confirmed appointments can be paid for");
    }
    if (appointment.payment?.status === "completed") {
      throw ApiError.conflict("This appointment has already been paid");
    }
    // Cancel any previous pending payment so we get a clean slate
    if (appointment.payment && appointment.payment.status === "pending") {
      await db.payment.update({
        where: { id: appointment.payment.id },
        data: { status: "cancelled" },
      });
    }

    const phone = normaliseMpesaPhone(input.phoneNumber);
    const push = await initiateStkPush({
      amount: appointment.feeKes,
      phone,
      accountRef: `APT-${appointment.id.slice(0, 8).toUpperCase()}`,
      description: `CareBora appointment payment`,
    });

    return db.payment.create({
      data: {
        appointmentId: appointment.id,
        patientId,
        providerId: appointment.providerId,
        amountKes: appointment.feeKes,
        phoneNumber: phone,
        checkoutRequestId: push.checkoutRequestId,
        merchantRequestId: push.merchantRequestId,
      },
      include: PAYMENT_INCLUDE,
    });
  },

  /** Handle the Daraja callback for an appointment payment. Returns true if matched. */
  async handleDarajaCallback(payload: MpesaCallback): Promise<boolean> {
    const cb = payload.Body.stkCallback;
    const payment = await db.payment.findUnique({
      where: { checkoutRequestId: cb.CheckoutRequestID },
    });
    if (!payment) return false;

    if (cb.ResultCode === 0) {
      const meta = extractCallbackMeta(cb.CallbackMetadata?.Item ?? []);
      const platformFee = Math.round(payment.amountKes * PLATFORM_FEE_PERCENT / 100);
      const providerNet = payment.amountKes - platformFee;

      await db.$transaction([
        db.payment.update({
          where: { id: payment.id },
          data: {
            status: "completed",
            mpesaReceiptNumber: meta.receiptNumber ?? null,
            paidAt: new Date(),
          },
        }),
        db.ledgerEntry.create({
          data: {
            paymentId: payment.id,
            type: "platform_fee",
            amountKes: platformFee,
            description: `${PLATFORM_FEE_PERCENT}% platform commission`,
          },
        }),
        db.ledgerEntry.create({
          data: {
            paymentId: payment.id,
            type: "provider_payout",
            amountKes: providerNet,
            description: "Provider net payout",
          },
        }),
      ]);

      // Fire-and-forget notification
      const full = await db.payment.findUnique({
        where: { id: payment.id },
        include: { patient: { select: { email: true, fullName: true, phone: true } }, provider: { select: { fullName: true } } },
      });
      if (full) {
        void notificationService.paymentReceived({
          patientEmail: full.patient.email,
          patientPhone: full.patient.phone,
          patientName: full.patient.fullName,
          providerName: full.provider.fullName,
          amountKes: full.amountKes,
          receiptNumber: full.mpesaReceiptNumber,
          context: "appointment",
        });
      }
    } else {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: "failed", failureReason: cb.ResultDesc },
      });
    }
    return true;
  },

  /** List payments for the calling user. */
  async list(userId: string, role: UserRole, query: PaymentsQuery) {
    const isProvider = PROVIDER_ROLES.includes(role);
    const where = {
      ...(isProvider ? { providerId: userId } : { patientId: userId }),
      ...(query.status ? { status: query.status } : {}),
    };
    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        include: PAYMENT_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: query.offset,
        take: query.limit,
      }),
      db.payment.count({ where }),
    ]);
    return { payments, total, limit: query.limit, offset: query.offset };
  },

  async getById(paymentId: string, userId: string) {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: PAYMENT_INCLUDE,
    });
    if (!payment) throw ApiError.notFound("Payment not found");
    if (payment.patientId !== userId && payment.providerId !== userId) {
      throw ApiError.forbidden();
    }
    return payment;
  },

  /**
   * Mark a payment as refunded and reverse the ledger.
   * Actual M-Pesa B2C reversal is manual / handled separately.
   */
  async refund(paymentId: string, userId: string, role: UserRole) {
    const payment = await db.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw ApiError.notFound("Payment not found");

    const isAdmin = role === "admin";
    const isProvider = PROVIDER_ROLES.includes(role) && payment.providerId === userId;
    if (!isAdmin && !isProvider) throw ApiError.forbidden();
    if (payment.status !== "completed") {
      throw ApiError.badRequest("Only completed payments can be refunded");
    }

    await db.$transaction([
      db.payment.update({
        where: { id: paymentId },
        data: { status: "refunded" },
      }),
      db.ledgerEntry.create({
        data: {
          paymentId,
          type: "refund",
          amountKes: -payment.amountKes,
          description: "Refund issued",
        },
      }),
    ]);

    return db.payment.findUnique({ where: { id: paymentId }, include: PAYMENT_INCLUDE });
  },
};
