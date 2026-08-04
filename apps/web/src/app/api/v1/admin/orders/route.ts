import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { ordersQuerySchema } from "@carebora/shared";
import { orderService } from "@carebora/core";

/** GET /api/v1/admin/orders — every checkout, across every patient and vendor. */
export const GET = route(async (req) => {
  await requireAuth(req, ["admin"]);
  const query = ordersQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const result = await orderService.adminList(query);
  return jsonOk(result);
});
