import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { symptomCheckSchema } from "@carebora/shared";
import { aiService } from "@carebora/core";

/** POST /api/v1/ai/symptom-check — Claude-powered triage and specialist recommendation. */
export const POST = route(async (req) => {
  await requireAuth(req, ["patient", "doctor", "nurse", "physio"]);
  const input = symptomCheckSchema.parse(await req.json());
  const data = await aiService.symptomCheck(input.symptoms, input.patientAge, input.allergies);
  return jsonOk(data);
});
