import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { replySupportTicketSchema } from "@carebora/shared";
import { supportService } from "@carebora/core";

/** POST /api/v1/support/tickets/:ticketId/reply — add a message to a thread. */
export const POST = route(async (req, { params }: { params: Promise<{ ticketId: string }> }) => {
  const { ticketId } = await params;
  const auth = await requireAuth(req);
  const input = replySupportTicketSchema.parse(await req.json());
  const message = await supportService.reply(
    ticketId,
    { userId: auth.sub, isAdmin: auth.role === "admin" },
    input,
  );
  return jsonOk(message, 201);
});
