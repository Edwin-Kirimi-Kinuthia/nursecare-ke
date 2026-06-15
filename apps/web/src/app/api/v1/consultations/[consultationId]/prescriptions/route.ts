import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { createPrescriptionSchema, PROVIDER_ROLES } from "@carebora/shared";
import { prescriptionService } from "@carebora/core";

/** GET /api/v1/consultations/:consultationId/prescriptions — list prescriptions. */
export const GET = route(async (req, { params }: { params: Promise<{ consultationId: string }> }) => {
  const { consultationId } = await params;
  const auth = await requireAuth(req);
  const prescriptions = await prescriptionService.list(consultationId, auth.sub, auth.role);
  return jsonOk(prescriptions);
});

/** POST /api/v1/consultations/:consultationId/prescriptions — issue a prescription (provider only). */
export const POST = route(async (req, { params }: { params: Promise<{ consultationId: string }> }) => {
  const { consultationId } = await params;
  const auth = await requireAuth(req, PROVIDER_ROLES);
  const input = createPrescriptionSchema.parse(await req.json());
  const prescription = await prescriptionService.create(consultationId, auth.sub, auth.role, input);
  return jsonOk(prescription, 201);
});
