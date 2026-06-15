import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { appointmentsQuerySchema, createAppointmentSchema } from "@carebora/shared";
import { appointmentService } from "@carebora/core";

/** GET /api/v1/appointments — list appointments for the authenticated user. */
export const GET = route(async (req) => {
  const auth = await requireAuth(req);
  const { searchParams } = new URL(req.url);
  const query = appointmentsQuerySchema.parse(Object.fromEntries(searchParams));
  const result = await appointmentService.list(auth.sub, auth.role, query);
  return jsonOk(result);
});

/** POST /api/v1/appointments — book a slot (patients only). */
export const POST = route(async (req) => {
  const auth = await requireAuth(req, ["patient"]);
  const input = createAppointmentSchema.parse(await req.json());
  const appointment = await appointmentService.create(auth.sub, input);
  return jsonOk(appointment, 201);
});
