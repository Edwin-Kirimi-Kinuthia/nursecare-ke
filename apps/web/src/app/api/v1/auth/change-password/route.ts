import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { requestChangePasswordSchema } from "@carebora/shared";
import { authService } from "@carebora/core";

/** POST /api/v1/auth/change-password — step 1: verify the current password, email a confirmation code. */
export const POST = route(async (req) => {
  const auth = await requireAuth(req);
  const input = requestChangePasswordSchema.parse(await req.json());
  const result = await authService.requestChangePasswordOtp(auth.sub, input.currentPassword);
  return jsonOk(result);
});
