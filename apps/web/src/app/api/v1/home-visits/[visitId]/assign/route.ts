import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { assignHomeVisitSchema } from "@carebora/shared";
import { homeVisitService } from "@carebora/core";

/**
 * POST /api/v1/home-visits/:visitId/assign
 * Admin only — assigns a provider and sets the visit fee.
 * Moves visit from 'pending' → 'assigned' so the patient can pay.
 */
export const POST = route(async (req, { params }: { params: Promise<{ visitId: string }> }) => {
  const claims = await requireAuth(req, ["admin"]);
  const { visitId } = await params;
  const body = await req.json();
  const input = assignHomeVisitSchema.parse(body);
  const visit = await homeVisitService.assign(visitId, claims.role, input);
  return jsonOk(visit);
});
