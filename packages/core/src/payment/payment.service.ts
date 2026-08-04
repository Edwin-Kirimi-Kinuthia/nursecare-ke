import { db, Prisma, type Payment, type PaymentSubject } from "@carebora/db";
import { ApiError, PROVIDER_ROLES, type MpesaStkInput, type PaymentsQuery, type UserRole } from "@carebora/shared";
import { getEnv } from "../config/env";
import { initiatePayment, type InitiatePaymentResult } from "./gateway";

const PAYMENT_INCLUDE = {
  patient: { select: { id: true, fullName: true, phone: true, email: true } },
  provider: { select: { id: true, fullName: true } },
  ledgerEntries: true,
} as const;

export interface InitiateInput {
  subjectType: PaymentSubject;
  subjectId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  providerId?: string | null;
  orgId?: string | null;
  amountKes: number;
  phoneNumber: string;
  description: string;
  refPrefix: string;
}

/** A minimal, JSON-safe payment shape attached to appointments/orders/home visits. */
export interface PaymentSummary {
  id: string;
  status: Payment["status"];
  method: Payment["method"];
  gateway: Payment["gateway"];
  gatewayRef: string;
  amountKes: number;
  receiptNumber: string | null;
  failureReason: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export function toPaymentSummary(p: Payment): PaymentSummary {
  return {
    id: p.id,
    status: p.status,
    method: p.method,
    gateway: p.gateway,
    gatewayRef: p.gatewayRef,
    amountKes: p.amountKes,
    receiptNumber: p.receiptNumber,
    failureReason: p.failureReason,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
  };
}

export const paymentService = {
  /** Patient initiates payment for a confirmed appointment. */
  async initiateMpesa(patientId: string, input: MpesaStkInput) {
    const appointment = await db.appointment.findUnique({ where: { id: input.appointmentId } });
    if (!appointment) throw ApiError.notFound("Appointment not found");
    if (appointment.patientId !== patientId) throw ApiError.forbidden();
    if (appointment.status !== "confirmed") {
      throw ApiError.badRequest("Only confirmed appointments can be paid for");
    }
    const existing = await db.payment.findFirst({
      where: { subjectType: "appointment", subjectId: appointment.id, status: "completed" },
    });
    if (existing) throw ApiError.conflict("This appointment has already been paid");

    const patient = await db.user.findUniqueOrThrow({ where: { id: patientId } });
    const { payment } = await this.initiate({
      subjectType: "appointment",
      subjectId: appointment.id,
      patientId,
      providerId: appointment.providerId,
      patientName: patient.fullName,
      patientEmail: patient.email,
      amountKes: appointment.feeKes,
      phoneNumber: input.phoneNumber,
      description: "CareBora appointment payment",
      refPrefix: "APT",
    });
    return toPaymentSummary(payment);
  },

  /**
   * Cancel any prior pending payment for a subject, call the active gateway, and
   * create the new Payment row. Every checkout path (appointment, order, home
   * visit, and future ambulance/lab) goes through this one function.
   */
  async initiate(input: InitiateInput): Promise<{ payment: Payment; redirect: InitiatePaymentResult["redirect"] }> {
    const prior = await db.payment.findFirst({
      where: { subjectType: input.subjectType, subjectId: input.subjectId, status: "pending" },
    });
    if (prior) {
      await db.payment.update({ where: { id: prior.id }, data: { status: "cancelled" } });
    }

    const result = await initiatePayment({
      subjectType: input.subjectType,
      amountKes: input.amountKes,
      phoneNumber: input.phoneNumber,
      description: input.description,
      refPrefix: input.refPrefix,
      patientName: input.patientName,
      patientEmail: input.patientEmail,
    });

    const commissionPercent = Number(getEnv().PLATFORM_FEE_PERCENT);
    const payment = await db.payment.create({
      data: {
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        patientId: input.patientId,
        providerId: input.providerId ?? null,
        orgId: input.orgId ?? null,
        gateway: result.gateway,
        method: result.gateway === "till" ? "till" : "mpesa",
        amountKes: input.amountKes,
        phoneNumber: input.phoneNumber,
        gatewayRef: result.gatewayRef,
        gatewayTxnRef: result.gatewayTxnRef,
        commissionPercentSnapshot: commissionPercent,
        rawInitResponse: (result.rawInitResponse as Prisma.InputJsonValue) ?? Prisma.DbNull,
      },
    });

    return { payment, redirect: result.redirect };
  },

  /**
   * The single settlement path for every gateway and every subject type. Writes
   * the ledger split (gross sale, platform fee, vendor/provider payout) in one
   * transaction. Idempotent — a replayed success callback is a no-op once the
   * payment is already `completed`. Returns null if gatewayRef matches nothing.
   */
  async settle(
    gatewayRef: string,
    outcome: { success: boolean; receiptNumber?: string | null; gatewayTxnRef?: string | null; failureReason?: string | null },
  ): Promise<Payment | null> {
    const payment = await db.payment.findUnique({ where: { gatewayRef } });
    if (!payment) return null;
    if (payment.status === "completed") return payment; // already settled — ignore replay

    if (!outcome.success) {
      return db.payment.update({
        where: { id: payment.id },
        data: { status: "failed", failureReason: outcome.failureReason ?? "Payment failed" },
      });
    }

    const gross = payment.amountKes;
    const platformFee = Math.round((gross * payment.commissionPercentSnapshot) / 100);
    const net = gross - platformFee;
    const payoutType = payment.orgId ? "vendor_payout" : "provider_payout";
    const hasPayee = Boolean(payment.orgId || payment.providerId);

    const [updated] = await db.$transaction([
      db.payment.update({
        where: { id: payment.id },
        data: {
          status: "completed",
          receiptNumber: outcome.receiptNumber ?? payment.receiptNumber,
          gatewayTxnRef: outcome.gatewayTxnRef ?? payment.gatewayTxnRef,
          paidAt: new Date(),
        },
      }),
      db.ledgerEntry.create({
        data: { paymentId: payment.id, type: "gross_sale", amountKes: gross, description: "Gross sale" },
      }),
      ...(hasPayee
        ? [
            db.ledgerEntry.create({
              data: {
                paymentId: payment.id,
                type: "platform_fee",
                orgId: payment.orgId,
                providerId: payment.providerId,
                amountKes: platformFee,
                description: `${payment.commissionPercentSnapshot}% platform commission`,
              },
            }),
            db.ledgerEntry.create({
              data: {
                paymentId: payment.id,
                type: payoutType,
                orgId: payment.orgId,
                providerId: payment.providerId,
                amountKes: net,
                description: payment.orgId ? "Vendor net payout" : "Provider net payout",
              },
            }),
          ]
        : []),
    ]);

    return updated;
  },

  /** Till mode: patient reports the M-Pesa code → payment awaits admin verification. */
  async submitTill(gatewayRef: string, code: string): Promise<Payment | null> {
    const payment = await db.payment.findUnique({ where: { gatewayRef } });
    if (!payment) return null;
    if (payment.status === "completed") return payment;
    return db.payment.update({
      where: { id: payment.id },
      data: { status: "awaiting_verification", receiptNumber: code, failureReason: null },
    });
  },

  /** Admin decision on a Till payment. Approve → settle. Reject → back to pending. */
  async verifyTill(paymentId: string, approve: boolean): Promise<Payment> {
    const payment = await db.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw ApiError.notFound("Payment not found");
    if (payment.status !== "awaiting_verification") {
      throw ApiError.badRequest("This payment is not awaiting verification");
    }
    if (approve) {
      const settled = await this.settle(payment.gatewayRef, { success: true, receiptNumber: payment.receiptNumber });
      return settled!;
    }
    return db.payment.update({
      where: { id: paymentId },
      data: { status: "pending", failureReason: "Payment could not be verified", receiptNumber: null },
    });
  },

  /** A single subject's current payment (if any) — attached to appointments/orders/visits. */
  async getForSubject(subjectType: PaymentSubject, subjectId: string): Promise<PaymentSummary | null> {
    const payment = await db.payment.findFirst({
      where: { subjectType, subjectId },
      orderBy: { createdAt: "desc" },
    });
    return payment ? toPaymentSummary(payment) : null;
  },

  /** Batched version of getForSubject — avoids N+1 queries when listing many subjects. */
  async getForSubjects(subjectType: PaymentSubject, subjectIds: string[]): Promise<Map<string, PaymentSummary>> {
    if (subjectIds.length === 0) return new Map();
    const payments = await db.payment.findMany({
      where: { subjectType, subjectId: { in: subjectIds } },
      orderBy: { createdAt: "desc" },
    });
    const map = new Map<string, PaymentSummary>();
    for (const p of payments) {
      if (!map.has(p.subjectId)) map.set(p.subjectId, toPaymentSummary(p)); // first hit per id = most recent
    }
    return map;
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
    const payment = await db.payment.findUnique({ where: { id: paymentId }, include: PAYMENT_INCLUDE });
    if (!payment) throw ApiError.notFound("Payment not found");
    if (payment.patientId !== userId && payment.providerId !== userId) {
      throw ApiError.forbidden();
    }
    return payment;
  },

  /** Mark a payment as refunded and reverse the ledger. Gateway-side reversal is manual. */
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
        data: { status: "refunded", refundedKes: payment.amountKes },
      }),
      db.ledgerEntry.create({
        data: { paymentId, type: "refund", amountKes: -payment.amountKes, description: "Refund issued" },
      }),
    ]);

    return db.payment.findUnique({ where: { id: paymentId }, include: PAYMENT_INCLUDE });
  },
};
