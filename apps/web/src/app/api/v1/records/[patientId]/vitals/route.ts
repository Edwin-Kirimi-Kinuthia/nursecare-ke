import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { createVitalSignSchema } from "@carebora/shared";
import { recordsService } from "@carebora/core";

/** POST /api/v1/records/:patientId/vitals — patient self-logs, or a provider with access adds one. */
export const POST = route(async (req, { params }: { params: Promise<{ patientId: string }> }) => {
  const claims = await requireAuth(req);
  const { patientId } = await params;
  const input = createVitalSignSchema.parse(await req.json());
  const vital = await recordsService.createVital(patientId, claims, input);
  return jsonOk(vital, 201);
});
