import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { whatsAppService } from "@carebora/core";

/** GET /api/v1/admin/whatsapp — connection readiness and recent message delivery status. */
export const GET = route(async (req) => {
  await requireAuth(req, ["admin"]);
  return jsonOk(await whatsAppService.adminStatus());
});

/** POST /api/v1/admin/whatsapp — retry eligible failed and queued alerts (up to ten per batch). */
export const POST = route(async (req) => {
  await requireAuth(req, ["admin"]);
  return jsonOk(await whatsAppService.retryFailed());
});
