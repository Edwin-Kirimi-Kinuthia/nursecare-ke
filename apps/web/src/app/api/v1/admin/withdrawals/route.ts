import { earningsService } from "@carebora/core";
import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
/** GET /api/v1/admin/withdrawals — list pending and processing M-Pesa withdrawal requests. */
export const GET = route(async req => {
  await requireAuth(req, ["admin"]);
  return jsonOk(await earningsService.listRequests());
});
