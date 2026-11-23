import { withdrawalRequestSchema } from "@carebora/shared";
import { earningsService, b2cService } from "@carebora/core";
import { route, jsonOk } from "@/server/http";
import { earningsAuth } from "@/server/earnings-auth";
/** POST /api/v1/earnings/withdrawals — reserve earnings and submit an M-Pesa B2C withdrawal when enabled. Idempotent for the same requestKey. */
export const POST = route(async req => {
  const { payee, actorId } = await earningsAuth(req);
  const payout = await earningsService.withdraw(payee, actorId, withdrawalRequestSchema.parse(await req.json()));
  return jsonOk(payout.gateway === "mpesa_b2c" ? await b2cService.send(payout.id) : payout, 201);
});

export const maxDuration = 60;
