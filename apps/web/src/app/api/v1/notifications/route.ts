import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { inAppNotifications } from "@carebora/core";

/** GET /api/v1/notifications — the caller's notifications + unread count. */
export const GET = route(async (req) => {
  const auth = await requireAuth(req);
  const data = await inAppNotifications.list(auth.sub);
  return jsonOk(data);
});
