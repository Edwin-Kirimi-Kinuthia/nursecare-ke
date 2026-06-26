import { route, jsonOk } from "@/server/http";
import { providerMatchSchema } from "@carebora/shared";
import { aiService } from "@carebora/core";

/** POST /api/v1/ai/provider-match — recommend a provider specialty for a patient concern. */
export const POST = route(async (req) => {
  const input = providerMatchSchema.parse(await req.json());
  const data = await aiService.matchProvider(input.concern);
  return jsonOk(data);
});
