import { z } from "zod";
import { reconcileWithdrawalSchema } from "@carebora/shared";
import { b2cService } from "@carebora/core";
import { requireAuth } from "@/server/auth";
import { route, jsonOk } from "@/server/http";
/** POST /api/v1/admin/withdrawals/:id/reconcile — record an unresolved B2C outcome after checking the M-Pesa statement. Never sends another transfer. */
export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req, ["admin"]);
  const { id } = await ctx.params;
  return jsonOk(await b2cService.reconcile(z.string().uuid().parse(id), auth.sub, reconcileWithdrawalSchema.parse(await req.json())));
});
