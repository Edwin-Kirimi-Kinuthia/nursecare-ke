import { db, type Payment } from "@carebora/db";
import type { JengaCallback, JengaPgwCallback, MpesaCallback } from "@carebora/shared";
import { paymentService } from "./payment.service";
import { orderService } from "../pharmacy/order.service";
import { homeVisitService } from "../homevisit/homevisit.service";
import { notificationService } from "../notifications/notification.service";
import { queryOrderStatus } from "./jenga/stk";
import { verifyPgwCallback } from "./jenga/pgw";

/**
 * The single dispatch point after a Payment settles or fails — every gateway's
 * callback handler below ends by calling one of these two, so Order/HomeVisit
 * status and patient notifications stay correct regardless of which gateway
 * processed the money. Appointments need no extra step beyond the ledger/receipt.
 */
async function afterSettled(payment: Payment) {
  if (payment.subjectType === "order") {
    await orderService.onPaymentSettled(payment.subjectId, payment.id);
  } else if (payment.subjectType === "home_visit") {
    await homeVisitService.onPaymentSettled(payment.subjectId);
  } else if (payment.subjectType === "appointment" || payment.subjectType === "ambulance") {
    const [patient, provider, org] = await Promise.all([
      db.user.findUnique({ where: { id: payment.patientId }, select: { email: true, fullName: true, phone: true } }),
      payment.providerId ? db.user.findUnique({ where: { id: payment.providerId }, select: { fullName: true } }) : null,
      payment.orgId ? db.organization.findUnique({ where: { id: payment.orgId }, select: { name: true } }) : null,
    ]);
    if (patient) {
      void notificationService.paymentReceived({
        patientEmail: patient.email,
        patientPhone: patient.phone,
        patientName: patient.fullName,
        providerName: provider?.fullName ?? org?.name ?? "your provider",
        amountKes: payment.amountKes,
        receiptNumber: payment.receiptNumber,
        context: payment.subjectType === "ambulance" ? "ambulance service" : "appointment",
      });
    }
  }
}

async function afterFailed(payment: Payment) {
  if (payment.subjectType === "order") await orderService.onPaymentFailed(payment.subjectId);
  // home visits and appointments don't need failure-side cleanup (no stock to restore)
}

async function logEvent(source: string, payload: unknown, dedupeKey: string, paymentId: string | null, signatureValid: boolean) {
  try {
    await db.paymentEvent.create({ data: { source, payload: payload as object, dedupeKey, paymentId, signatureValid } });
    return true; // first time we've seen this event
  } catch {
    return false; // dedupeKey collision — already processed, treat as a no-op replay
  }
}

async function settleAndDispatch(gatewayRef: string, outcome: Parameters<typeof paymentService.settle>[1]) {
  const payment = await paymentService.settle(gatewayRef, outcome);
  if (!payment) return false;
  if (outcome.success) await afterSettled(payment);
  else await afterFailed(payment);
  return true;
}

export const settlementService = {
  /** Legacy direct-Daraja callback (kept for environments without Jenga creds yet). */
  async handleDarajaCallback(payload: MpesaCallback): Promise<boolean> {
    const cb = payload.Body.stkCallback;
    const isNew = await logEvent("mpesa_daraja", payload, `daraja:${cb.CheckoutRequestID}:${cb.ResultCode}`, null, false);
    if (!isNew) return true;

    if (cb.ResultCode === 0) {
      const items = cb.CallbackMetadata?.Item ?? [];
      const receiptNumber = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value as string | undefined;
      return settleAndDispatch(cb.CheckoutRequestID, {
        success: true,
        receiptNumber: receiptNumber ?? null,
        gatewayTxnRef: cb.MerchantRequestID,
      });
    }
    return settleAndDispatch(cb.CheckoutRequestID, { success: false, failureReason: cb.ResultDesc });
  },

  /**
   * Jenga STK confirmation callback / IPN. Unsigned per Jenga's docs, so we
   * confirm with the order-status query endpoint before trusting a success
   * signal — matches the "IPN recommended for final confirmation" guidance.
   * The exact callback shape (confirmation vs IPN) varies; both carry either our
   * orderReference or the paymentReference we stored as gatewayTxnRef.
   */
  async handleJengaStkCallback(payload: JengaCallback): Promise<boolean> {
    const data = payload as Record<string, unknown>;
    const nested = (data.data ?? {}) as Record<string, unknown>;
    const stkCallback = ((nested.Body as Record<string, unknown> | undefined)?.stkCallback ?? {}) as Record<string, unknown>;
    const transaction = (data.transaction ?? {}) as Record<string, unknown>;
    const customer = (data.customer ?? {}) as Record<string, unknown>;

    const orderReference = (customer.reference ?? data.orderReference) as string | undefined;
    const paymentReference = (data.transactionReference ?? stkCallback.CheckoutRequestID) as string | undefined;
    const key = orderReference ?? paymentReference;
    if (!key) return false;

    const isNew = await logEvent("jenga_stk", payload, `jenga_stk:${key}`, null, false);
    if (!isNew) return true;

    const payment = orderReference
      ? await db.payment.findUnique({ where: { gatewayRef: orderReference } })
      : await db.payment.findFirst({ where: { gatewayTxnRef: paymentReference } });
    if (!payment) return false;

    // Confirm via the query-status endpoint rather than trusting the unsigned callback outright.
    // If the query itself is unavailable, do NOT fall back to the callback's self-reported
    // status — that would let anyone who can guess (or has seen) a gatewayRef POST a forged
    // "success" callback and get it trusted whenever Jenga's query API has a blip. Leave the
    // payment pending instead; reconcilePending() retries the query on a schedule.
    const confirmed = await queryOrderStatus(payment.gatewayRef).catch(() => ({ found: false as const }));
    if (!confirmed.found) return false;

    if (confirmed.status === "SUCCESS") {
      return settleAndDispatch(payment.gatewayRef, {
        success: true,
        receiptNumber: (transaction.reference as string | undefined) ?? null,
        gatewayTxnRef: confirmed.gatewayTxnRef,
      });
    }
    return settleAndDispatch(payment.gatewayRef, {
      success: false,
      failureReason: (data.message as string | undefined) ?? "Payment failed",
    });
  },

  /** Jenga PGW hosted-checkout callback — verify the hash before trusting it. */
  async handleJengaPgwCallback(cb: JengaPgwCallback): Promise<boolean> {
    const isNew = await logEvent("jenga_pgw", cb, `jenga_pgw:${cb.transactionId}`, null, verifyPgwCallback(cb));
    if (!isNew) return true;
    if (!verifyPgwCallback(cb)) return false;

    if (cb.status === "paid") {
      return settleAndDispatch(cb.orderReference, {
        success: true,
        receiptNumber: cb.transactionId,
        gatewayTxnRef: cb.transactionId,
      });
    }
    return settleAndDispatch(cb.orderReference, { success: false, failureReason: cb.desc ?? "Payment not completed" });
  },

  /**
   * Dev/sandbox helper — fires a synthetic success outcome for a given
   * gatewayRef, exactly like a real gateway success callback would. Used by
   * `/payments/mpesa/simulate` since sandbox gateways don't reliably post a real
   * callback. Returns the subjectType if a payment matched, else null.
   */
  async simulateSuccess(gatewayRef: string): Promise<Payment["subjectType"] | null> {
    const before = await db.payment.findUnique({ where: { gatewayRef } });
    if (!before) return null;
    const ok = await settleAndDispatch(gatewayRef, {
      success: true,
      receiptNumber: `SIM${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
      gatewayTxnRef: `sim-${Date.now()}`,
    });
    return ok ? before.subjectType : null;
  },

  /** Till submit → awaiting_verification (no side effects until an admin approves). */
  async submitTill(gatewayRef: string, code: string): Promise<boolean> {
    const payment = await paymentService.submitTill(gatewayRef, code);
    return payment !== null;
  },

  /** Admin approve/reject on a Till payment. Approve settles + dispatches; reject just resets. */
  async verifyTill(paymentId: string, approve: boolean): Promise<Payment> {
    const payment = await paymentService.verifyTill(paymentId, approve);
    if (approve) await afterSettled(payment);
    return payment;
  },

  /**
   * Sweeps Jenga STK payments stuck `pending` for more than 10 minutes (a dropped
   * callback) and resolves them via the order-status query endpoint. Call from an
   * admin-triggered endpoint (no cron infra wired up yet).
   */
  async reconcilePending(): Promise<{ checked: number; settled: number; failed: number }> {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    const stuck = await db.payment.findMany({
      where: { status: "pending", gateway: "jenga_stk", createdAt: { lt: cutoff } },
      take: 50,
    });
    let settled = 0;
    let failed = 0;
    for (const payment of stuck) {
      const result = await queryOrderStatus(payment.gatewayRef).catch(() => ({ found: false as const }));
      if (!result.found) continue;
      if (result.status === "SUCCESS") {
        await settleAndDispatch(payment.gatewayRef, { success: true, gatewayTxnRef: result.gatewayTxnRef });
        settled++;
      } else if (result.status === "FAILED") {
        await settleAndDispatch(payment.gatewayRef, { success: false, failureReason: "Reconciled as failed" });
        failed++;
      }
    }
    return { checked: stuck.length, settled, failed };
  },
};
