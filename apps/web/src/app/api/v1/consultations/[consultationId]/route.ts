import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { patchConsultationSchema } from "@carebora/shared";
import { consultationService } from "@carebora/core";

/** GET /api/v1/consultations/:consultationId — fetch consultation details. */
export const GET = route(async (req, { params }: { params: Promise<{ consultationId: string }> }) => {
  const { consultationId } = await params;
  const auth = await requireAuth(req);
  const consultation = await consultationService.get(consultationId, auth.sub);
  return jsonOk(consultation);
});

/** PATCH /api/v1/consultations/:consultationId — update status or clinical notes. */
export const PATCH = route(async (req, { params }: { params: Promise<{ consultationId: string }> }) => {
  const { consultationId } = await params;
  const auth = await requireAuth(req);
  const input = patchConsultationSchema.parse(await req.json());
  const consultation = await consultationService.patch(consultationId, auth.sub, auth.role, input);
  return jsonOk(consultation);
});
