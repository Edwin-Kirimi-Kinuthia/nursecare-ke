import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { patchAppointmentSchema } from "@carebora/shared";
import { appointmentService } from "@carebora/core";

/** GET /api/v1/appointments/:appointmentId — fetch a single appointment. */
export const GET = route(async (req, { params }: { params: Promise<{ appointmentId: string }> }) => {
  const { appointmentId } = await params;
  const auth = await requireAuth(req);
  const appointment = await appointmentService.getById(appointmentId, auth.sub, auth.role);
  return jsonOk(appointment);
});

/** PATCH /api/v1/appointments/:appointmentId — update status or notes. */
export const PATCH = route(async (req, { params }: { params: Promise<{ appointmentId: string }> }) => {
  const { appointmentId } = await params;
  const auth = await requireAuth(req);
  const input = patchAppointmentSchema.parse(await req.json());
  const appointment = await appointmentService.patch(appointmentId, auth.sub, auth.role, input);
  return jsonOk(appointment);
});
