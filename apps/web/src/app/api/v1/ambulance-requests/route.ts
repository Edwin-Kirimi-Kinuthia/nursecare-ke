import { route, jsonOk } from "@/server/http";
import { requirePatient } from "@/server/auth";
import { createAmbulanceRequestSchema, ambulanceRequestsQuerySchema } from "@carebora/shared";
import { ambulanceService } from "@carebora/core";

/** GET /api/v1/ambulance-requests — the authenticated patient's own requests. */
export const GET = route(async (req) => {
  const claims = await requirePatient(req);
  const query = ambulanceRequestsQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const result = await ambulanceService.list(claims.sub, query);
  return jsonOk(result);
});

/** POST /api/v1/ambulance-requests — request an ambulance. */
export const POST = route(async (req) => {
  const claims = await requirePatient(req);
  const input = createAmbulanceRequestSchema.parse(await req.json());
  const request = await ambulanceService.request(claims.sub, input);
  return jsonOk(request, 201);
});
