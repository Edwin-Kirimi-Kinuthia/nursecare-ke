import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { vendorAmbulanceQueueQuerySchema } from "@carebora/shared";
import { ambulanceService } from "@carebora/core";

/** GET /api/v1/vendor/ambulance-requests — this org's dispatch queue (own + nearby unassigned). */
export const GET = route(async (req) => {
  const auth = await requireOrgMember(req);
  const query = vendorAmbulanceQueueQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const result = await ambulanceService.vendorQueue(auth.orgId, query);
  return jsonOk(result);
});
