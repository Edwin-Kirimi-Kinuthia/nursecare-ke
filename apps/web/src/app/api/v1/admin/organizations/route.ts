import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { orgsQuerySchema } from "@carebora/shared";
import { orgService } from "@carebora/core";

/** GET /api/v1/admin/organizations — list vendor businesses (admin queue + management). */
export const GET = route(async (req) => {
  await requireAuth(req, ["admin"]);
  const query = orgsQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const data = await orgService.adminList(query);
  return jsonOk(data);
});
