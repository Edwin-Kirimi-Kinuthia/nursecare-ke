import { route, jsonOk } from "@/server/http";
import { requirePatient } from "@/server/auth";
import { homeVisitStkSchema } from "@carebora/shared";
import { homeVisitService } from "@carebora/core";

/**
 * POST /api/v1/home-visits/:visitId/pay
 * Patient initiates M-Pesa STK push to pay for an assigned visit.
 */
export const POST = route(async (req, { params }: { params: Promise<{ visitId: string }> }) => {
  const claims = await requirePatient(req);
  const { visitId } = await params;
  const body = await req.json();
  const input = homeVisitStkSchema.parse(body);
  const visit = await homeVisitService.initiateMpesa(visitId, claims.sub, input);
  return jsonOk(visit);
});
