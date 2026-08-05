import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { createConditionSchema } from "@carebora/shared";
import { recordsService } from "@carebora/core";

/** POST /api/v1/records/:patientId/conditions */
export const POST = route(async (req, { params }: { params: Promise<{ patientId: string }> }) => {
  const claims = await requireAuth(req);
  const { patientId } = await params;
  const input = createConditionSchema.parse(await req.json());
  const condition = await recordsService.createCondition(patientId, claims.sub, input);
  return jsonOk(condition, 201);
});
