import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { ApiError } from "@carebora/shared";
import { settlementService } from "@carebora/core";

/**
 * POST /api/v1/payments/mpesa/simulate — dev/sandbox helper.
 * Sandbox gateways (Daraja and Jenga UAT alike) don't reliably post a real
 * success callback, so this fires the same success outcome our webhooks handle,
 * completing the matching appointment payment, pharmacy order, or home-visit
 * payment. Gated on NODE_ENV, not just MPESA_ENV — a production deploy that
 * forgets to set MPESA_ENV must not leave this reachable.
 */
export const POST = route(async (req) => {
  await requireAuth(req);
  if (process.env.NODE_ENV === "production" || process.env.MPESA_ENV === "production") {
    throw ApiError.forbidden("Payment simulation is disabled in production.");
  }

  const { gatewayRef } = (await req.json()) as { gatewayRef?: string };
  if (!gatewayRef) throw ApiError.badRequest("gatewayRef is required");

  const type = await settlementService.simulateSuccess(gatewayRef);
  if (!type) throw ApiError.notFound("No pending payment matched that reference.");
  return jsonOk({ completed: true, type });
});
