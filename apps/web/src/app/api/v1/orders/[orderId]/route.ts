import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { patchOrderSchema } from "@carebora/shared";
import { orderService } from "@carebora/core";

/** GET /api/v1/orders/:orderId — fetch order details. */
export const GET = route(async (req, { params }: { params: Promise<{ orderId: string }> }) => {
  const claims = await requireAuth(req);
  const { orderId } = await params;
  const order = await orderService.getById(orderId, claims.sub, claims.role);
  return jsonOk(order);
});

/** PATCH /api/v1/orders/:orderId — advance order status. */
export const PATCH = route(async (req, { params }: { params: Promise<{ orderId: string }> }) => {
  const claims = await requireAuth(req);
  const { orderId } = await params;
  const body = await req.json();
  const input = patchOrderSchema.parse(body);
  const order = await orderService.patch(orderId, claims.sub, claims.role, input);
  return jsonOk(order);
});
