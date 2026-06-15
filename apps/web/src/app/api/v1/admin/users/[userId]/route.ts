import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { adminPatchUserSchema } from "@carebora/shared";
import { adminService } from "@carebora/core";

/** GET /api/v1/admin/users/:userId — full user detail with profiles, documents, sessions. */
export const GET = route(async (req, { params }: { params: Promise<{ userId: string }> }) => {
  await requireAuth(req, ["admin"]);
  const { userId } = await params;
  const user = await adminService.getUser(userId);
  return jsonOk(user);
});

/** PATCH /api/v1/admin/users/:userId — activate/deactivate or change role. */
export const PATCH = route(async (req, { params }: { params: Promise<{ userId: string }> }) => {
  const claims = await requireAuth(req, ["admin"]);
  const { userId } = await params;
  const body = await req.json();
  const input = adminPatchUserSchema.parse(body);
  const user = await adminService.patchUser(userId, claims.sub, input);
  return jsonOk(user);
});
