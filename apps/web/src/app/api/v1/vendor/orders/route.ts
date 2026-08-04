import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { vendorOrdersQuerySchema } from "@carebora/shared";
import { orderService } from "@carebora/core";

/** GET /api/v1/vendor/orders — this org's slice of every checkout it's part of. */
export const GET = route(async (req) => {
  const auth = await requireOrgMember(req);
  const query = vendorOrdersQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const result = await orderService.listForOrg(auth.orgId, query);
  return jsonOk(result);
});
