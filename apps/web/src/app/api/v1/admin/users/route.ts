import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { adminUsersQuerySchema, adminCreateProviderSchema } from "@carebora/shared";
import { adminService } from "@carebora/core";

/** GET /api/v1/admin/users — list all users with optional role/active/search filters. */
export const GET = route(async (req) => {
  await requireAuth(req, ["admin"]);
  const { searchParams } = new URL(req.url);
  const query = adminUsersQuerySchema.parse(Object.fromEntries(searchParams));
  const result = await adminService.listUsers(query);
  return jsonOk(result);
});

/** POST /api/v1/admin/users — recruit a provider directly (skips the apply/review queue). */
export const POST = route(async (req) => {
  const auth = await requireAuth(req, ["admin"]);
  const input = adminCreateProviderSchema.parse(await req.json());
  const user = await adminService.createProviderAccount(auth.sub, input);
  return jsonOk(user, 201);
});
