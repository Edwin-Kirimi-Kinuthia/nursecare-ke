import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { recordsService } from "@carebora/core";

/**
 * GET /api/v1/records/:patientId — the full medical record. Gated by
 * assertCanRead: the patient themselves, a provider with a care relationship,
 * a granted user, or an admin passing ?reason= (break-glass, always logged).
 */
export const GET = route(async (req, { params }: { params: Promise<{ patientId: string }> }) => {
  const claims = await requireAuth(req);
  const { patientId } = await params;
  const reason = new URL(req.url).searchParams.get("reason") ?? undefined;
  const record = await recordsService.getRecord(patientId, claims, reason);
  return jsonOk(record);
});
