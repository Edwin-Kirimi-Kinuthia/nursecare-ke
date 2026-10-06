import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { changePasswordSchema } from "@carebora/shared";
import { authService } from "@carebora/core";

/** POST /api/v1/auth/change-password — rotate your own password (requires the current one). */
export const POST = route(async (req) => {
  const auth = await requireAuth(req);
  const input = changePasswordSchema.parse(await req.json());
  const result = await authService.changePassword(auth.sub, input.currentPassword, input.newPassword);
  return jsonOk(result);
});
