import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { settlementService } from "@carebora/core";

/**
 * POST /api/v1/admin/payments/reconcile
 * Sweeps Jenga STK payments stuck `pending` for 10+ minutes (a dropped callback)
 * and resolves them via the order-status query endpoint. Manually triggered —
 * there's no cron infrastructure wired up yet (would be a Vercel Cron hitting
 * this route on a schedule).
 */
export const POST = route(async (req) => {
  await requireAuth(req, ["admin"]);
  const result = await settlementService.reconcilePending();
  return jsonOk(result);
});
