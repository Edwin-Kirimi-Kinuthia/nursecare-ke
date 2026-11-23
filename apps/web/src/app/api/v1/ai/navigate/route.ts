import { navigationQuestionSchema } from "@carebora/shared";
import { aiService } from "@carebora/core";
import { route, jsonOk } from "@/server/http";

// Public so first-time visitors can find care before signing in.
/** POST /api/v1/ai/navigate — find trusted service links with AI navigation help and a service-guide fallback. */
export const POST = route(async req => {
  const { message } = navigationQuestionSchema.parse(await req.json());
  return jsonOk(await aiService.navigate(message));
});
