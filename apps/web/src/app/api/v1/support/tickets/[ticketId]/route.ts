import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { supportService } from "@carebora/core";

/** GET /api/v1/support/tickets/:ticketId — one thread (own, or any for an admin). */
export const GET = route(async (req, { params }: { params: Promise<{ ticketId: string }> }) => {
  const { ticketId } = await params;
  const auth = await requireAuth(req);
  return jsonOk(await supportService.getById(ticketId, auth.sub, auth.role === "admin"));
});
