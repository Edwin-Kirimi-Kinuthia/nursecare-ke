import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { registerPushDeviceSchema } from "@carebora/shared";
import { pushService } from "@carebora/core";

/**
 * POST /api/v1/push/devices — register this phone for push notifications.
 * Call it after sign-in (and whenever the token changes). Safe to repeat.
 */
export const POST = route(async (req) => {
  const auth = await requireAuth(req);
  const input = registerPushDeviceSchema.parse(await req.json());
  return jsonOk(await pushService.register(auth.sub, input.token, input.platform), 201);
});
