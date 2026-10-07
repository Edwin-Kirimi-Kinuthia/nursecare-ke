import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { confirmChangePasswordSchema } from "@carebora/shared";
import { authService } from "@carebora/core";

/** POST /api/v1/auth/change-password/confirm — step 2: confirm the emailed code, set the new password. */
export const POST = route(async (req) => {
  const auth = await requireAuth(req);
  const input = confirmChangePasswordSchema.parse(await req.json());
  const result = await authService.confirmChangePassword(auth.sub, input.code, input.newPassword);
  return jsonOk(result);
});
