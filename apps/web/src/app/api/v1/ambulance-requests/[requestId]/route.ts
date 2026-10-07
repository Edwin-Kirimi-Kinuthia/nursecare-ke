import { route, jsonOk } from "@/server/http";
import { requireAuth, requirePatient } from "@/server/auth";
import { z } from "zod";
import { ambulanceService } from "@carebora/core";

type Params = { params: Promise<{ requestId: string }> };

/** GET /api/v1/ambulance-requests/:requestId — the patient's own view. */
export const GET = route(async (req, { params }: Params) => {
  const claims = await requireAuth(req);
  const { requestId } = await params;
  const request = await ambulanceService.getById(requestId, claims.sub, claims.role);
  return jsonOk(request);
});

const cancelSchema = z.object({ cancelReason: z.string().trim().max(500).optional() });

/** PATCH /api/v1/ambulance-requests/:requestId — patient cancels (before dispatch). */
export const PATCH = route(async (req, { params }: Params) => {
  const claims = await requirePatient(req);
  const { requestId } = await params;
  const { cancelReason } = cancelSchema.parse(await req.json());
  const request = await ambulanceService.cancel(requestId, claims.sub, claims.role, cancelReason);
  return jsonOk(request);
});
