import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { grantAccessSchema } from "@carebora/shared";
import { recordsService } from "@carebora/core";

/** GET /api/v1/records/:patientId/grants — who the patient has given standing access to. */
export const GET = route(async (req, { params }: { params: Promise<{ patientId: string }> }) => {
  const claims = await requireAuth(req);
  const { patientId } = await params;
  const grants = await recordsService.listGrants(patientId, claims.sub);
  return jsonOk({ grants });
});

/** POST /api/v1/records/:patientId/grants — grant a provider standing access by email. */
export const POST = route(async (req, { params }: { params: Promise<{ patientId: string }> }) => {
  const claims = await requireAuth(req);
  const { patientId } = await params;
  const input = grantAccessSchema.parse(await req.json());
  const grant = await recordsService.grantAccess(patientId, claims.sub, input);
  return jsonOk(grant, 201);
});
