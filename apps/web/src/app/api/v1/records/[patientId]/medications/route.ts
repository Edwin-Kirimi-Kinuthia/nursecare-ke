import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { createMedicationEntrySchema } from "@carebora/shared";
import { recordsService } from "@carebora/core";

/** POST /api/v1/records/:patientId/medications */
export const POST = route(async (req, { params }: { params: Promise<{ patientId: string }> }) => {
  const claims = await requireAuth(req);
  const { patientId } = await params;
  const input = createMedicationEntrySchema.parse(await req.json());
  const entry = await recordsService.createMedication(patientId, claims.sub, input);
  return jsonOk(entry, 201);
});
