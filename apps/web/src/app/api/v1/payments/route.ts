import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { paymentsQuerySchema } from "@carebora/shared";
import { paymentService } from "@carebora/core";

/** GET /api/v1/payments — list payments for the authenticated user. */
export const GET = route(async (req) => {
  const auth = await requireAuth(req);
  const { searchParams } = new URL(req.url);
  const query = paymentsQuerySchema.parse(Object.fromEntries(searchParams));
  const result = await paymentService.list(auth.sub, auth.role, query);
  return jsonOk(result);
});
