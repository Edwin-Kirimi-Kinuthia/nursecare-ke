import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { patchAllergySchema } from "@carebora/shared";
import { recordsService } from "@carebora/core";

/** PATCH /api/v1/records/:patientId/allergies/:allergyId */
export const PATCH = route(async (req, { params }: { params: Promise<{ patientId: string; allergyId: string }> }) => {
  const claims = await requireAuth(req);
  const { patientId, allergyId } = await params;
  const input = patchAllergySchema.parse(await req.json());
  const allergy = await recordsService.patchAllergy(patientId, claims.sub, allergyId, input);
  return jsonOk(allergy);
});
