import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { recordsService } from "@carebora/core";

/** DELETE /api/v1/records/:patientId/grants/:grantId — revoke access. */
export const DELETE = route(async (req, { params }: { params: Promise<{ patientId: string; grantId: string }> }) => {
  const claims = await requireAuth(req);
  const { patientId, grantId } = await params;
  const grant = await recordsService.revokeAccess(patientId, claims.sub, grantId);
  return jsonOk(grant);
});
