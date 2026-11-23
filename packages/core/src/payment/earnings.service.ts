import { b2cConfig, payoutsMode } from "./b2c-gateway";
import { db, Prisma } from "@carebora/db";
import { ApiError } from "@carebora/shared";

export type Payee = { orgId: string; providerId?: never } | { providerId: string; orgId?: never };
type Tx = Prisma.TransactionClient;
export const payoutPublicSelect = {
  id: true, orgId: true, providerId: true, amountKes: true, phoneNumber: true,
  status: true, method: true, gateway: true, reference: true, failureReason: true,
  createdAt: true, processedAt: true,
} as const;
const earningTypes = ["vendor_payout", "provider_payout"] as const;
export async function earningsTotals(tx: Tx, payee: Payee) {
  const [earnings, legacyPaid, reserved, paid] = await Promise.all([
    tx.ledgerEntry.aggregate({ where: { ...payee, type: { in: [...earningTypes] } }, _sum: { amountKes: true } }),
    tx.ledgerEntry.aggregate({ where: { ...payee, type: "payout_settled" }, _sum: { amountKes: true } }),
    tx.payout.aggregate({ where: { ...payee, status: { in: ["pending", "processing", "review"] } }, _sum: { amountKes: true } }),
    tx.payout.aggregate({ where: { ...payee, status: "paid" }, _sum: { amountKes: true } }),
  ]);
  const earnedKes = earnings._sum.amountKes ?? 0;
  const paidKes = Math.abs(legacyPaid._sum.amountKes ?? 0) + (paid._sum.amountKes ?? 0);
  const pendingKes = reserved._sum.amountKes ?? 0;
  return { earnedKes, paidKes, pendingKes, availableKes: Math.max(0, earnedKes - paidKes - pendingKes) };
}
// Transaction-scoped lock serializes requests and admin processing for one payee.
export async function lockPayee(tx: Tx, payee: Payee) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${payee.orgId ?? payee.providerId!}, 0))`;
}
export const earningsService = {
  async summary(payee: Payee) {
    return db.$transaction(async tx => {
      await lockPayee(tx, payee);
      const balances = await earningsTotals(tx, payee);
      const withdrawals = await tx.payout.findMany({ where: payee, orderBy: { createdAt: "desc" }, take: 50, select: payoutPublicSelect });
      return { ...balances, withdrawals, withdrawalMode: payoutsMode(), minimumWithdrawalKes: payoutsMode() === "mpesa_b2c" ? 10 : 1 };
    });
  },
  async withdraw(payee: Payee, actorId: string, input: { amountKes: number; phoneNumber: string; requestKey: string }) {
    const mode = payoutsMode();
    if (mode === "mpesa_b2c") {
      b2cConfig();
      if (input.amountKes < 10) throw ApiError.badRequest("Minimum M-Pesa withdrawal is KES 10");
    }
    return db.$transaction(async tx => {
      await lockPayee(tx, payee);
      const key = `${payee.orgId ?? payee.providerId}:${input.requestKey}`;
      const existing = await tx.payout.findUnique({ where: { requestKey: key } });
      if (existing) {
        if (existing.amountKes !== input.amountKes || existing.phoneNumber !== input.phoneNumber) throw ApiError.conflict("This request has already been used for another withdrawal");
        return tx.payout.findUniqueOrThrow({ where: { id: existing.id }, select: payoutPublicSelect });
      }
      const balance = await earningsTotals(tx, payee);
      if (input.amountKes > balance.availableKes) throw ApiError.badRequest("Withdrawal exceeds your available earnings");
      const now = new Date();
      const payout = await tx.payout.create({ data: { ...payee, ...input, requestKey: key, periodStart: now, periodEnd: now, method: "mpesa", gateway: mode === "mpesa_b2c" ? "mpesa_b2c" : null }, select: payoutPublicSelect });
      await tx.auditLog.create({ data: { actorId, action: "payout.requested", entityType: "Payout", entityId: payout.id, metadata: { amountKes: input.amountKes } } });
      return payout;
    });
  },
  async listRequests() {
    return db.payout.findMany({ where: { method: "mpesa", status: { in: ["pending", "processing", "review"] } }, orderBy: { createdAt: "asc" }, take: 100, select: payoutPublicSelect });
  },
  async process(id: string, actorId: string, input: { status: "processing" | "paid" | "failed"; reference?: string }) {
    try {
      return await db.$transaction(async tx => {
        const payout = await tx.payout.findUnique({ where: { id } });
        if (!payout) throw ApiError.notFound("Withdrawal not found");
        const payee: Payee = payout.orgId ? { orgId: payout.orgId } : { providerId: payout.providerId! };
        await lockPayee(tx, payee);
        const current = await tx.payout.findUniqueOrThrow({ where: { id } });
        if (current.gateway === "mpesa_b2c") throw ApiError.conflict("This withdrawal is handled by M-Pesa B2C. Use reconciliation for unresolved transfers.");
        const allowed = current.status === "pending" ? ["processing", "failed"] : current.status === "processing" ? ["paid", "failed"] : [];
        if (!allowed.includes(input.status)) throw ApiError.conflict("This withdrawal has already changed. Refresh and try again.");
        if (input.status === "paid" && !input.reference) throw ApiError.badRequest("Enter the confirmed M-Pesa transaction receipt");
        const balance = await earningsTotals(tx, payee);
        if (input.status === "processing" && balance.earnedKes - balance.paidKes < balance.pendingKes) throw ApiError.badRequest("Earnings changed after this request. Review the balance before paying.");
        const updated = await tx.payout.update({ where: { id }, data: { status: input.status, reference: input.reference, processedById: actorId, processedAt: new Date() } });
        await tx.auditLog.create({ data: { actorId, action: `payout.${input.status}`, entityType: "Payout", entityId: id, metadata: { reference: input.reference ?? null } } });
        return updated;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw ApiError.conflict("That M-Pesa receipt has already been recorded");
      throw e;
    }
  },
};
