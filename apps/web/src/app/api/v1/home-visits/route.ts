import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { createHomeVisitSchema, homeVisitsQuerySchema } from "@carebora/shared";
import { homeVisitService } from "@carebora/core";

/** GET /api/v1/home-visits — list visits for the authenticated user. */
export const GET = route(async (req) => {
  const claims = await requireAuth(req);
  const { searchParams } = new URL(req.url);
  const query = homeVisitsQuerySchema.parse(Object.fromEntries(searchParams));
  const result = await homeVisitService.list(claims.sub, claims.role, query);
  return jsonOk(result);
});

/** POST /api/v1/home-visits — patient requests a home visit. */
export const POST = route(async (req) => {
  const claims = await requireAuth(req, ["patient"]);
  const body = await req.json();
  const input = createHomeVisitSchema.parse(body);
  const visit = await homeVisitService.request(claims.sub, input);
  return jsonOk(visit, 201);
});
