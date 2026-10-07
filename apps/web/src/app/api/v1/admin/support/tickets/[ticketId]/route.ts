import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { patchSupportTicketSchema } from "@carebora/shared";
import { supportService } from "@carebora/core";

/** PATCH /api/v1/admin/support/tickets/:ticketId — change status or assignment. */
export const PATCH = route(async (req, { params }: { params: Promise<{ ticketId: string }> }) => {
  const { ticketId } = await params;
  await requireAuth(req, ["admin"]);
  const input = patchSupportTicketSchema.parse(await req.json());
  return jsonOk(await supportService.patch(ticketId, input));
});
