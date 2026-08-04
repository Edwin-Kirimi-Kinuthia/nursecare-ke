import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { orderService } from "@carebora/core";

/**
 * GET /api/v1/orders/:orderId — fetch a checkout, with every vendor's slice
 * and fulfilment status nested. Fulfilment updates happen per vendor via
 * PATCH /api/v1/vendor/orders/:vendorOrderId, not here.
 */
export const GET = route(async (req, { params }: { params: Promise<{ orderId: string }> }) => {
  const claims = await requireAuth(req);
  const { orderId } = await params;
  const order = await orderService.getById(orderId, claims.sub, claims.role);
  return jsonOk(order);
});
