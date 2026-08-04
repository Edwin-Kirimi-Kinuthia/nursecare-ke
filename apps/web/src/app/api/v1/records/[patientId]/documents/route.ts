import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { createMedicalDocumentSchema } from "@carebora/shared";
import { recordsService } from "@carebora/core";

/** POST /api/v1/records/:patientId/documents — patient uploads, or a provider with access attaches one. */
export const POST = route(async (req, { params }: { params: Promise<{ patientId: string }> }) => {
  const claims = await requireAuth(req);
  const { patientId } = await params;
  const input = createMedicalDocumentSchema.parse(await req.json());
  const document = await recordsService.uploadDocument(patientId, claims, input);
  return jsonOk(document, 201);
});
