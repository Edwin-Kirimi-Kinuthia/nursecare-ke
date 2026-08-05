import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { labOrdersQuerySchema } from "@carebora/shared";
import { labService } from "@carebora/core";

/** GET /api/v1/vendor/lab-orders — this lab's order queue. */
export const GET = route(async (req) => {
  const auth = await requireOrgMember(req, { orgType: "lab" });
  const query = labOrdersQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const result = await labService.listForOrg(auth.orgId, query);
  return jsonOk(result);
});
