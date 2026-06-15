import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { PROVIDER_ROLES } from "@carebora/shared";
import { paymentService } from "@carebora/core";

/**
 * POST /api/v1/payments/:paymentId/refund
 * Mark a completed payment as refunded (DB-side; actual M-Pesa B2C reversal is manual).
 * Accessible by the provider or admin.
 */
export const POST = route(async (req, { params }: { params: Promise<{ paymentId: string }> }) => {
  const { paymentId } = await params;
  const auth = await requireAuth(req, [...PROVIDER_ROLES, "admin"]);
  const payment = await paymentService.refund(paymentId, auth.sub, auth.role);
  return jsonOk(payment);
});
