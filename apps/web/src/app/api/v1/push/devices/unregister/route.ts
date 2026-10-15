import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { unregisterPushDeviceSchema } from "@carebora/shared";
import { pushService } from "@carebora/core";

/**
 * POST /api/v1/push/devices/unregister — stop notifying this phone. Call it on
 * sign-out, before the session is discarded, so the next person to use the
 * handset doesn't receive the previous person's notifications.
 *
 * A POST rather than DELETE because some mobile HTTP stacks drop a DELETE body.
 */
export const POST = route(async (req) => {
  const auth = await requireAuth(req);
  const input = unregisterPushDeviceSchema.parse(await req.json());
  return jsonOk(await pushService.unregister(auth.sub, input.token));
});
