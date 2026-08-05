import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { createLabOrderSchema, labOrdersQuerySchema } from "@carebora/shared";
import { labService } from "@carebora/core";

/** GET /api/v1/lab-orders — the authenticated patient's own lab orders. */
export const GET = route(async (req) => {
  const claims = await requireAuth(req, ["patient"]);
  const query = labOrdersQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const result = await labService.list(claims.sub, query);
  return jsonOk(result);
});

/** POST /api/v1/lab-orders — order tests from a lab and initiate payment. */
export const POST = route(async (req) => {
  const claims = await requireAuth(req, ["patient"]);
  const input = createLabOrderSchema.parse(await req.json());
  const order = await labService.create(claims.sub, input);
  return jsonOk(order, 201);
});
