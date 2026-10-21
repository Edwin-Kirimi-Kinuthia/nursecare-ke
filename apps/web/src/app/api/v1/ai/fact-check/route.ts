import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { factCheckSchema } from "@carebora/shared";
import { aiService } from "@carebora/core";

/** POST /api/v1/ai/fact-check — clinical reference for providers during a consultation. */
export const POST = route(async (req) => {
  await requireAuth(req, ["doctor", "nurse", "physio"]);
  const input = factCheckSchema.parse(await req.json());
  const data = await aiService.factCheck(input.question);
  return jsonOk(data);
});
export const maxDuration = 120;
