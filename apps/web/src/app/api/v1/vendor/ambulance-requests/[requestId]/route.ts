import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { patchAmbulanceRequestSchema } from "@carebora/shared";
import { ambulanceService } from "@carebora/core";

/** PATCH /api/v1/vendor/ambulance-requests/:requestId — advance dispatch status, or set the fee. */
export const PATCH = route(async (req, { params }: { params: Promise<{ requestId: string }> }) => {
  const auth = await requireOrgMember(req, { roles: ["owner", "manager", "staff"], orgType: "ambulance" });
  const { requestId } = await params;
  const input = patchAmbulanceRequestSchema.parse(await req.json());
  const request = await ambulanceService.patch(requestId, auth.orgId, auth.sub, input);
  return jsonOk(request);
});
