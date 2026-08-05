import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { createAmbulanceSchema } from "@carebora/shared";
import { ambulanceService } from "@carebora/core";

/** GET /api/v1/vendor/ambulances — this org's fleet. */
export const GET = route(async (req) => {
  const auth = await requireOrgMember(req, { orgType: "ambulance" });
  const ambulances = await ambulanceService.listFleet(auth.orgId);
  return jsonOk({ ambulances });
});

/** POST /api/v1/vendor/ambulances — add a vehicle to the fleet. */
export const POST = route(async (req) => {
  const auth = await requireOrgMember(req, { roles: ["owner", "manager"], orgType: "ambulance" });
  const input = createAmbulanceSchema.parse(await req.json());
  const ambulance = await ambulanceService.createAmbulance(auth.orgId, input);
  return jsonOk(ambulance, 201);
});
