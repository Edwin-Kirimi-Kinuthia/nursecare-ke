import { route, jsonOk } from "@/server/http";
import { consultationService } from "@carebora/core";

/** POST /api/v1/consultations/livekit-webhook — signed LiveKit participant events for browser and app calls. */
export const POST = route(async (req) => {
  await consultationService.livekitWebhook(await req.text(), req.headers.get("authorization"));
  return jsonOk({ received: true });
});
