import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { inAppNotifications } from "@carebora/core";

/** POST /api/v1/notifications/:notificationId/read — mark one notification read. */
export const POST = route(async (req, { params }: { params: Promise<{ notificationId: string }> }) => {
  const { notificationId } = await params;
  const auth = await requireAuth(req);
  const data = await inAppNotifications.markRead(auth.sub, notificationId);
  return jsonOk(data);
});
