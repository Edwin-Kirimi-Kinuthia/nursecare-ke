import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { patchAmbulanceSchema } from "@carebora/shared";
import { ambulanceService } from "@carebora/core";

/** PATCH /api/v1/vendor/ambulances/:ambulanceId — update fleet vehicle details or availability. */
export const PATCH = route(async (req, { params }: { params: Promise<{ ambulanceId: string }> }) => {
  const auth = await requireOrgMember(req, { roles: ["owner", "manager"] });
  const { ambulanceId } = await params;
  const input = patchAmbulanceSchema.parse(await req.json());
  const ambulance = await ambulanceService.patchAmbulance(auth.orgId, ambulanceId, input);
  return jsonOk(ambulance);
});
