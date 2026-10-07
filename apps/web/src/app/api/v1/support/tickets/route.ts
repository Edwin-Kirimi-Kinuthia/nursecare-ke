import { route, jsonOk } from "@/server/http";
import { getAuth } from "@/server/auth";
import { createSupportTicketSchema, supportTicketsQuerySchema } from "@carebora/shared";
import { supportService } from "@carebora/core";

/**
 * POST /api/v1/support/tickets — open a support thread or request a document.
 *
 * Deliberately open to visitors as well as signed-in clients: someone who
 * can't sign in is exactly the person who most needs to reach support. The
 * ticket records the contact details they supply either way.
 */
export const POST = route(async (req) => {
  const auth = await getAuth(req);
  const input = createSupportTicketSchema.parse(await req.json());
  const ticket = await supportService.create(auth?.sub ?? null, input);
  return jsonOk(ticket, 201);
});

/** GET /api/v1/support/tickets — the signed-in client's own threads. */
export const GET = route(async (req) => {
  const auth = await getAuth(req);
  if (!auth) return jsonOk({ tickets: [], total: 0, limit: 0, offset: 0 });
  const query = supportTicketsQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  return jsonOk(await supportService.listMine(auth.sub, query));
});
