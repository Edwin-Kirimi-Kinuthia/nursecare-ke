import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { createOrderSchema, ordersQuerySchema } from "@carebora/shared";
import { orderService } from "@carebora/core";

/** GET /api/v1/orders — list orders for the authenticated user. */
export const GET = route(async (req) => {
  const claims = await requireAuth(req);
  const { searchParams } = new URL(req.url);
  const query = ordersQuerySchema.parse(Object.fromEntries(searchParams));
  const result = await orderService.list(claims.sub, claims.role, query);
  return jsonOk(result);
});

/** POST /api/v1/orders — place a new pharmacy order and initiate STK push. */
export const POST = route(async (req) => {
  const claims = await requireAuth(req, ["patient"]);
  const body = await req.json();
  const input = createOrderSchema.parse(body);
  const order = await orderService.create(claims.sub, input);
  return jsonOk(order, 201);
});
