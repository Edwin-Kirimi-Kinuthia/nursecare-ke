import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { patchHomeVisitSchema } from "@carebora/shared";
import { homeVisitService } from "@carebora/core";

/** GET /api/v1/home-visits/:visitId */
export const GET = route(async (req, { params }: { params: Promise<{ visitId: string }> }) => {
  const claims = await requireAuth(req);
  const { visitId } = await params;
  const visit = await homeVisitService.getById(visitId, claims.sub, claims.role);
  return jsonOk(visit);
});

/** PATCH /api/v1/home-visits/:visitId — update status or visit notes. */
export const PATCH = route(async (req, { params }: { params: Promise<{ visitId: string }> }) => {
  const claims = await requireAuth(req);
  const { visitId } = await params;
  const body = await req.json();
  const input = patchHomeVisitSchema.parse(body);
  const visit = await homeVisitService.patch(visitId, claims.sub, claims.role, input);
  return jsonOk(visit);
});
