import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { createImmunizationSchema } from "@carebora/shared";
import { recordsService } from "@carebora/core";

/** POST /api/v1/records/:patientId/immunizations */
export const POST = route(async (req, { params }: { params: Promise<{ patientId: string }> }) => {
  const claims = await requireAuth(req);
  const { patientId } = await params;
  const input = createImmunizationSchema.parse(await req.json());
  const immunization = await recordsService.createImmunization(patientId, claims.sub, input);
  return jsonOk(immunization, 201);
});
