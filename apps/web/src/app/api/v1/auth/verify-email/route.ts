import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { verifyEmailSchema } from "@carebora/shared";
import { authService } from "@carebora/core";

/** POST /api/v1/auth/verify-email — confirm the 6-digit code emailed at signup. */
export const POST = route(async (req) => {
  const auth = await requireAuth(req);
  const input = verifyEmailSchema.parse(await req.json());
  const user = await authService.verifyEmail(auth.sub, input.code);
  return jsonOk(user);
});
