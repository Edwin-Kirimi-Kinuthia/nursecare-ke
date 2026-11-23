import { earningsService } from "@carebora/core";
import { route, jsonOk } from "@/server/http";
import { earningsAuth } from "@/server/earnings-auth";
/** GET /api/v1/earnings — net earnings and withdrawal history for the signed-in provider or organization owner. */
export const GET = route(async req => {
  const { payee } = await earningsAuth(req);
  return jsonOk(await earningsService.summary(payee));
});
