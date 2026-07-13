import { db } from "@carebora/db";
import { ApiError, type MpesaCallback, type MpesaStkInput, type PaymentsQuery, type UserRole } from "@carebora/shared";
import { initiateStkPush, normaliseMpesaPhone } from "./daraja";
import { isTillMode, tillReference } from "./mode";
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

/**
 * Settle a completed appointment payment: mark it paid, write the platform-fee /
 * provider-payout ledger entries, and fire the receipt notification. Shared by the
 * Daraja callback and the admin Till-verification flow.
 */
async function settleAppointmentPayment(paymentId: string, receiptNumber: string | null) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status === "completed") return;

  const platformFee = Math.round(payment.amountKes * PLATFORM_FEE_PERCENT / 100);
  const providerNet = payment.amountKes - platformFee;

  await db.$transaction([
    db.payment.update({
      where: { id: payment.id },
      data: { status: "completed", mpesaReceiptNumber: receiptNumber, paidAt: new Date() },
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

    // Interim Till mode: no STK push — create a pending record the patient will
    // attach an M-Pesa code to, then an admin verifies it.
    if (isTillMode()) {
      return db.payment.create({
        data: {
          appointmentId: appointment.id,
          patientId,
          providerId: appointment.providerId,
          amountKes: appointment.feeKes,
          phoneNumber: phone,
          method: "till",
          checkoutRequestId: tillReference(),
        },
        include: PAYMENT_INCLUDE,
      });
    }

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
    // Already settled — ignore late/duplicate callbacks (incl. sandbox noise) so
    // a success is never downgraded by a subsequent failure.
    if (payment.status === "completed") return true;

    if (cb.ResultCode === 0) {
      const meta = extractCallbackMeta(cb.CallbackMetadata?.Item ?? []);
      await settleAppointmentPayment(payment.id, meta.receiptNumber ?? null);
    } else {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: "failed", failureReason: cb.ResultDesc },
      });
    }
    return true;
  },

  /**
   * Till mode: the patient reports the M-Pesa confirmation code for a Till payment.
   * Moves the payment to `awaiting_verification` for admin review. Matched by the
   * synthetic checkout reference. Returns true if a matching payment was found.
   */
  async submitTill(checkoutRequestId: string, code: string): Promise<boolean> {
    const payment = await db.payment.findUnique({ where: { checkoutRequestId } });
    if (!payment) return false;
    if (payment.status === "completed") return true;
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "awaiting_verification", method: "till", mpesaReceiptNumber: code, failureReason: null },
    });
    return true;
  },

  /**
   * Admin decision on a Till payment awaiting verification.
   * Approve → settle (paid + ledger + receipt). Reject → back to `pending` so the
   * patient can re-submit a corrected code.
   */
  async verifyTill(paymentId: string, approve: boolean) {
    const payment = await db.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw ApiError.notFound("Payment not found");
    if (payment.status !== "awaiting_verification") {
      throw ApiError.badRequest("This payment is not awaiting verification");
    }
    if (approve) {
      await settleAppointmentPayment(payment.id, payment.mpesaReceiptNumber);
    } else {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: "pending", failureReason: "Payment could not be verified", mpesaReceiptNumber: null },
      });
    }
    return db.payment.findUnique({ where: { id: paymentId }, include: PAYMENT_INCLUDE });
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
