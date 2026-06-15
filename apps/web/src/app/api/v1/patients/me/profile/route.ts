import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { patchPatientProfileSchema } from "@carebora/shared";
import { profileService } from "@carebora/core";

/** GET /api/v1/patients/me/profile — return the authenticated patient's profile. */
export const GET = route(async (req) => {
  const auth = await requireAuth(req, ["patient"]);
  const profile = await profileService.getPatient(auth.sub);
  return jsonOk(profile);
});

/** PATCH /api/v1/patients/me/profile — update the authenticated patient's profile. */
export const PATCH = route(async (req) => {
  const auth = await requireAuth(req, ["patient"]);
  const data = patchPatientProfileSchema.parse(await req.json());
  const profile = await profileService.patchPatient(auth.sub, data);
  return jsonOk(profile);
});
