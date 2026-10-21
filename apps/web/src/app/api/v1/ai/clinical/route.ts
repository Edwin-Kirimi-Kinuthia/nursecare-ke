import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { clinicalQuerySchema } from "@carebora/shared";
import { aiService } from "@carebora/core";

/**
 * POST /api/v1/ai/clinical — clinicians' reference: drug dosing (routes, doses,
 * durations), differential diagnosis for a presentation, or a free question.
 * Clinical staff only; patients use /ai/symptom-check.
 */
export const POST = route(async (req) => {
  await requireAuth(req, ["doctor", "nurse", "physio", "admin"]);
  const { mode, query, ...ctx } = clinicalQuerySchema.parse(await req.json());
  return jsonOk(await aiService.clinicalQuery(mode, query, ctx));
});
export const maxDuration = 120;
