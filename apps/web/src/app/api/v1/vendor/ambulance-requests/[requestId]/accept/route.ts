import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { acceptAmbulanceRequestSchema } from "@carebora/shared";
import { ambulanceService } from "@carebora/core";

/** POST /api/v1/vendor/ambulance-requests/:requestId/accept — first org to accept wins. */
export const POST = route(async (req, { params }: { params: Promise<{ requestId: string }> }) => {
  const auth = await requireOrgMember(req, { roles: ["owner", "manager", "staff"], orgType: "ambulance" });
  const { requestId } = await params;
  const input = acceptAmbulanceRequestSchema.parse(await req.json());
  const request = await ambulanceService.accept(requestId, auth.orgId, auth.sub, input);
  return jsonOk(request);
});
