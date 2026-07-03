import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { inAppNotifications } from "@carebora/core";

/** POST /api/v1/notifications/read-all — mark all the caller's notifications read. */
export const POST = route(async (req) => {
  const auth = await requireAuth(req);
  const data = await inAppNotifications.markAllRead(auth.sub);
  return jsonOk(data);
});
