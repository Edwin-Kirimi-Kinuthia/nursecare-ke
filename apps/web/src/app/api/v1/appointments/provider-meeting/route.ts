import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { PROVIDER_ROLES, providerMeetingSchema } from "@carebora/shared";
import { appointmentService } from "@carebora/core";

/** POST /api/v1/appointments/provider-meeting — schedule a free meeting with any registered client (verified providers only). */
export const POST = route(async (req) => {
  const auth = await requireAuth(req, PROVIDER_ROLES);
  const input = providerMeetingSchema.parse(await req.json());
  const appointment = await appointmentService.scheduleMeeting(auth.sub, auth.role, input);
  return jsonOk(appointment, 201);
});
