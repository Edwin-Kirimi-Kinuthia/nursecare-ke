import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { whatsAppService } from "@carebora/core";
import { whatsAppPreferenceSchema } from "@carebora/shared";

/** GET /api/v1/notifications/whatsapp/preferences — the caller's WhatsApp opt-in. */
export const GET = route(async (req) => {
  const auth = await requireAuth(req);
  return jsonOk(await whatsAppService.preferences(auth.sub));
});

/** PATCH /api/v1/notifications/whatsapp/preferences — consent to or stop operational WhatsApp alerts. */
export const PATCH = route(async (req) => {
  const auth = await requireAuth(req);
  const input = whatsAppPreferenceSchema.parse(await req.json());
  return jsonOk(await whatsAppService.setPreferences(auth.sub, input));
});
