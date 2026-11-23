import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { db, type Payout } from "@carebora/db";
import { ApiError } from "@carebora/shared";
import { b2cBase, b2cConfig, b2cOAuth } from "./b2c-gateway";
import { earningsTotals, lockPayee, payoutPublicSelect, type Payee } from "./earnings.service";

type Result = { ResultCode: number; ResultDesc: string; OriginatorConversationID?: string; ConversationID?: string; TransactionID?: string; ResultParameters?: { ResultParameter: { Key: string; Value?: string | number }[] } };
const payeeOf = (p: Payout): Payee => p.orgId ? { orgId: p.orgId } : { providerId: p.providerId! };
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const readPublic = (id: string) => db.payout.findUniqueOrThrow({ where: { id }, select: payoutPublicSelect });

export const b2cService = {
  /** Claim once before the outbound call. Never resend an attempted disbursement. */
  async send(id: string) {
    const initial = await db.payout.findUniqueOrThrow({ where: { id } });
    if (initial.gateway !== "mpesa_b2c" || initial.status !== "pending" || initial.submittedAt) return readPublic(id);
    const config = b2cConfig();
    // OAuth cannot move money. Failure here leaves an unsubmitted request retryable.
    let accessToken: string;
    try { accessToken = await b2cOAuth(config); }
    catch {
      await db.payout.updateMany({ where: { id, status: "pending", submittedAt: null }, data: { failureReason: "M-Pesa authorization is unavailable. The request is pending; no transfer was submitted." } });
      return readPublic(id);
    }
    const token = randomBytes(32).toString("hex");
    const origin = randomUUID();
    const claimed = await db.$transaction(async tx => {
      const payee = payeeOf(initial);
      await lockPayee(tx, payee);
      const current = await tx.payout.findUniqueOrThrow({ where: { id } });
      if (current.status !== "pending" || current.submittedAt) return false;
      const balance = await earningsTotals(tx, payee);
      if (balance.earnedKes - balance.paidKes < balance.pendingKes) {
        await tx.payout.update({ where: { id }, data: { status: "failed", failureReason: "Available earnings changed before the transfer could be submitted." } });
        return false;
      }
      await tx.payout.update({ where: { id }, data: { status: "processing", submittedAt: new Date(), originatorConversationId: origin, callbackTokenHash: tokenHash(token), failureReason: null } });
      await tx.auditLog.create({ data: { action: "payout.b2c_submitted", entityType: "Payout", entityId: id, metadata: { originatorConversationId: origin } } });
      return true;
    });
    if (!claimed) return readPublic(id);
    const callbackBase = config.MPESA_B2C_CALLBACK_BASE_URL.replace(/\/$/, "");
    try {
      const response = await fetch(`${b2cBase(config)}/mpesa/b2c/v3/paymentrequest`, {
        method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(25_000),
        body: JSON.stringify({ OriginatorConversationID: origin, InitiatorName: config.MPESA_B2C_INITIATOR,
          SecurityCredential: config.MPESA_B2C_SECURITY_CREDENTIAL, CommandID: "BusinessPayment",
          Amount: initial.amountKes, PartyA: config.MPESA_B2C_SHORTCODE, PartyB: initial.phoneNumber,
          Remarks: "Care Bora earnings withdrawal", Occasion: id,
          ResultURL: `${callbackBase}/result/${id}?token=${token}`,
          QueueTimeOutURL: `${callbackBase}/timeout/${id}?token=${token}`,
        }),
      });
      const json = await response.json() as { ResponseCode?: string | number; ConversationID?: string; errorCode?: string };
      if (response.ok && String(json.ResponseCode) === "0" && json.ConversationID) {
        await db.payout.updateMany({ where: { id, status: "processing" }, data: { conversationId: json.ConversationID } });
      } else {
        // Only an explicit rejection releases the reservation. HTTP 5xx, malformed
        // responses and connection loss may happen after M-Pesa has accepted money.
        const rejected = response.status < 500 && ((json.ResponseCode != null && String(json.ResponseCode) !== "0") || (response.status >= 400 && !!json.errorCode));
        await db.payout.updateMany({ where: { id, status: "processing" }, data: {
          status: rejected ? "failed" : "review",
          failureReason: rejected ? "M-Pesa rejected the transfer request. Funds remain in your available earnings." : "Transfer outcome is being reconciled. Your balance remains reserved; do not submit another transfer.",
        } });
      }
    } catch {
      await db.payout.updateMany({ where: { id, status: "processing" }, data: { status: "review", failureReason: "M-Pesa has not confirmed the transfer yet. Your balance remains reserved while the team reconciles it." } });
    }
    return readPublic(id);
  },

  async callback(id: string, token: string, result: Result, timeout = false) {
    return db.$transaction(async tx => {
      const payout = await tx.payout.findUnique({ where: { id } });
      const supplied = Buffer.from(tokenHash(token), "hex");
      const expected = Buffer.from(payout?.callbackTokenHash ?? "", "hex");
      if (!payout || payout.gateway !== "mpesa_b2c" || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw ApiError.forbidden("Invalid callback");
      await lockPayee(tx, payeeOf(payout));
      const current = await tx.payout.findUniqueOrThrow({ where: { id } });
      const originMatches = result.OriginatorConversationID === current.originatorConversationId;
      const conversationMatches = !!current.conversationId && result.ConversationID === current.conversationId;
      if (!originMatches && !conversationMatches) throw ApiError.forbidden("Unmatched callback");
      if (current.conversationId && result.ConversationID && result.ConversationID !== current.conversationId) throw ApiError.forbidden("Unmatched conversation");
      if (["paid", "failed"].includes(current.status)) return; // idempotent terminal result
      if (timeout) {
        await tx.payout.update({ where: { id }, data: { status: "review", failureReason: "M-Pesa processing timed out. Balance is reserved pending reconciliation." } });
        return;
      }
      const params = result.ResultParameters?.ResultParameter ?? [];
      const value = (key: string) => params.find(p => p.Key === key)?.Value;
      const success = result.ResultCode === 0;
      const receipt = String(value("TransactionReceipt") ?? result.TransactionID ?? "");
      if (success) {
        const phone = String(value("ReceiverPartyPublicName") ?? "").split(" - ")[0]!.replace(/\D/g, "");
        if (Number(value("TransactionAmount")) !== current.amountKes || phone !== current.phoneNumber || !/^[A-Z0-9]{10}$/.test(receipt)) {
          await tx.payout.update({ where: { id }, data: { status: "review", failureReason: "M-Pesa result details require verification by the team." } });
          return;
        }
      }
      await tx.payout.update({ where: { id }, data: {
        status: success ? "paid" : "failed", reference: success ? receipt : null,
        conversationId: result.ConversationID ?? current.conversationId, resultCode: result.ResultCode,
        processedAt: new Date(), failureReason: success ? null : "M-Pesa could not complete the transfer. Your earnings are available again.",
      } });
      await tx.auditLog.create({ data: { action: success ? "payout.b2c_paid" : "payout.b2c_failed", entityType: "Payout", entityId: id, metadata: { resultCode: result.ResultCode, reference: success ? receipt : null } } });
    });
  },

  /** Explicit admin reconciliation after checking the M-Pesa statement. Never sends money. */
  async reconcile(id: string, actorId: string, input: { outcome: "paid" | "failed"; reference?: string; note: string }) {
    return db.$transaction(async tx => {
      const payout = await tx.payout.findUniqueOrThrow({ where: { id } });
      await lockPayee(tx, payeeOf(payout));
      const current = await tx.payout.findUniqueOrThrow({ where: { id } });
      const canRejectUnsent = current.status === "pending" && !current.submittedAt && input.outcome === "failed";
      if (current.gateway !== "mpesa_b2c" || (!canRejectUnsent && !["review", "processing"].includes(current.status))) throw ApiError.conflict("Only unresolved B2C requests can be reconciled");
      if (input.outcome === "paid" && !input.reference) throw ApiError.badRequest("A confirmed M-Pesa receipt is required");
      await tx.payout.update({ where: { id }, data: { status: input.outcome, reference: input.outcome === "paid" ? input.reference : null, processedById: actorId, processedAt: new Date(), failureReason: input.outcome === "failed" ? "Transfer confirmed unsuccessful by the team. Balance released." : null } });
      await tx.auditLog.create({ data: { actorId, action: "payout.b2c_reconciled", entityType: "Payout", entityId: id, metadata: { ...input } } });
      return tx.payout.findUniqueOrThrow({ where: { id }, select: payoutPublicSelect });
    });
  },
};
