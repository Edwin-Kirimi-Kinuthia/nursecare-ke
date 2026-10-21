import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { symptomCheckSchema } from "@carebora/shared";
import { aiService } from "@carebora/core";

/** POST /api/v1/ai/symptom-check — symptom guidance: likely causes, self-care, OTC options, red flags, urgency. */
export const POST = route(async (req) => {
  await requireAuth(req);
  const input = symptomCheckSchema.parse(await req.json());
  const { symptoms, ...ctx } = input;
  const data = await aiService.symptomCheck(symptoms, ctx);
  return jsonOk(data);
});
export const maxDuration = 120;
