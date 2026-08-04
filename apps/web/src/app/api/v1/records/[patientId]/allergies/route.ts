import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { createAllergySchema } from "@carebora/shared";
import { recordsService } from "@carebora/core";

/** POST /api/v1/records/:patientId/allergies — patient adds an allergy to their own record. */
export const POST = route(async (req, { params }: { params: Promise<{ patientId: string }> }) => {
  const claims = await requireAuth(req);
  const { patientId } = await params;
  const input = createAllergySchema.parse(await req.json());
  const allergy = await recordsService.createAllergy(patientId, claims.sub, input);
  return jsonOk(allergy, 201);
});
