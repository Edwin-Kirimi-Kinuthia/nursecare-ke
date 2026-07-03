import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { appointmentsQuerySchema } from "@carebora/shared";
import { adminService } from "@carebora/core";

/** GET /api/v1/admin/appointments — platform-wide appointment oversight (admin). */
export const GET = route(async (req) => {
  await requireAuth(req, ["admin"]);
  const query = appointmentsQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const result = await adminService.listAppointments(query);
  return jsonOk(result);
});
