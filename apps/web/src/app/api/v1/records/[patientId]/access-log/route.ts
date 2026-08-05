import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { recordsService } from "@carebora/core";

/** GET /api/v1/records/:patientId/access-log — every read of the patient's record, granted or denied. */
export const GET = route(async (req, { params }: { params: Promise<{ patientId: string }> }) => {
  const claims = await requireAuth(req);
  const { patientId } = await params;
  const logs = await recordsService.listAccessLog(patientId, claims.sub);
  return jsonOk({ logs });
});
