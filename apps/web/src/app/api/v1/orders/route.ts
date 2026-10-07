import { route, jsonOk } from "@/server/http";
import { requirePatient } from "@/server/auth";
import { createOrderSchema, ordersQuerySchema } from "@carebora/shared";
import { orderService } from "@carebora/core";

/** GET /api/v1/orders — list the authenticated patient's checkouts. */
export const GET = route(async (req) => {
  const claims = await requirePatient(req);
  const query = ordersQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const result = await orderService.list(claims.sub, query);
  return jsonOk(result);
});

/** POST /api/v1/orders — checkout a cart (may span multiple vendor pharmacies) and initiate payment. */
export const POST = route(async (req) => {
  const claims = await requirePatient(req);
  const input = createOrderSchema.parse(await req.json());
  const order = await orderService.create(claims.sub, input);
  return jsonOk(order, 201);
});
