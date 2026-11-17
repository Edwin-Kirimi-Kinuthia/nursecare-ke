import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { PROVIDER_ROLES } from "@carebora/shared";
import { consultationService } from "@carebora/core";

/**
 * POST /api/v1/appointments/:appointmentId/consultation
 * Provider starts or resumes their consultation, including completed appointments.
 * Resuming preserves the clinical record and requires no additional payment.
 */
export const POST = route(async (req, { params }: { params: Promise<{ appointmentId: string }> }) => {
  const { appointmentId } = await params;
  const auth = await requireAuth(req, PROVIDER_ROLES);
  const consultation = await consultationService.start(appointmentId, auth.sub);
  return jsonOk(consultation, 201);
});
