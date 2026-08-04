import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { patchConditionSchema } from "@carebora/shared";
import { recordsService } from "@carebora/core";

/** PATCH /api/v1/records/:patientId/conditions/:conditionId */
export const PATCH = route(async (req, { params }: { params: Promise<{ patientId: string; conditionId: string }> }) => {
  const claims = await requireAuth(req);
  const { patientId, conditionId } = await params;
  const input = patchConditionSchema.parse(await req.json());
  const condition = await recordsService.patchCondition(patientId, claims.sub, conditionId, input);
  return jsonOk(condition);
});
