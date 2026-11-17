import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { PROVIDER_ROLES, issueSickOffSchema } from "@carebora/shared";
import { sickOffService } from "@carebora/core";
import { validateSigningImages } from "@/server/sick-off-pdf";

/** GET /api/v1/consultations/:consultationId/sick-offs — list issued certificates (participants only). */
export const GET = route(async (req, { params }: { params: Promise<{ consultationId: string }> }) => {
  const auth = await requireAuth(req);
  const { consultationId } = await params;
  return jsonOk(await sickOffService.list(consultationId, auth.sub));
});

/** POST /api/v1/consultations/:consultationId/sick-offs — treating provider signs a sick-off after a teleconsultation assessment. */
export const POST = route(async (req, { params }: { params: Promise<{ consultationId: string }> }) => {
  const auth = await requireAuth(req, PROVIDER_ROLES);
  const { consultationId } = await params;
  const input = issueSickOffSchema.parse(await req.json());
  await validateSigningImages(input.signatureDataUrl, input.stampDataUrl);
  const certificate = await sickOffService.issue(consultationId, auth.sub, auth.role, input);
  return jsonOk(certificate, 201);
});
