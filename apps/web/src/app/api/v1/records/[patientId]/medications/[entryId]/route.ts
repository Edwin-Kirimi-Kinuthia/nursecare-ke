import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { patchMedicationEntrySchema } from "@carebora/shared";
import { recordsService } from "@carebora/core";

/** PATCH /api/v1/records/:patientId/medications/:entryId */
export const PATCH = route(async (req, { params }: { params: Promise<{ patientId: string; entryId: string }> }) => {
  const claims = await requireAuth(req);
  const { patientId, entryId } = await params;
  const input = patchMedicationEntrySchema.parse(await req.json());
  const entry = await recordsService.patchMedication(patientId, claims.sub, entryId, input);
  return jsonOk(entry);
});
