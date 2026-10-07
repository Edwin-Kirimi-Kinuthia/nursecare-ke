import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { supportTicketsQuerySchema } from "@carebora/shared";
import { supportService } from "@carebora/core";

/** GET /api/v1/admin/support/tickets — the support inbox. */
export const GET = route(async (req) => {
  await requireAuth(req, ["admin"]);
  const query = supportTicketsQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  return jsonOk(await supportService.adminList(query));
});
