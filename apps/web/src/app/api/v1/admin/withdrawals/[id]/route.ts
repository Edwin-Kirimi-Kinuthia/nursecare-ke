import { z } from "zod";
import { processWithdrawalSchema } from "@carebora/shared";
import { earningsService } from "@carebora/core";
import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
/** PATCH /api/v1/admin/withdrawals/:id — claim a request, record a confirmed M-Pesa receipt or release an unpaid request. */
export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req, ["admin"]);
  const { id } = await ctx.params;
  const input = processWithdrawalSchema.parse(await req.json());
  return jsonOk(await earningsService.process(z.string().uuid().parse(id), auth.sub, input));
});
