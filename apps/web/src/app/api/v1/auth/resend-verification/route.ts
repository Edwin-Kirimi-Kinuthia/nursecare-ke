import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { authService } from "@carebora/core";

/** POST /api/v1/auth/resend-verification — send a fresh email verification code. */
export const POST = route(async (req) => {
  const auth = await requireAuth(req);
  const result = await authService.requestEmailVerification(auth.sub);
  return jsonOk(result);
});
