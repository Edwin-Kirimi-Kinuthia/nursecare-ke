import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { paymentService } from "@carebora/core";

/** GET /api/v1/payments/:paymentId — fetch a single payment / receipt. */
export const GET = route(async (req, { params }: { params: Promise<{ paymentId: string }> }) => {
  const { paymentId } = await params;
  const auth = await requireAuth(req);
  const payment = await paymentService.getById(paymentId, auth.sub);
  return jsonOk(payment);
});
