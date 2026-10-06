import { route, jsonOk } from "@/server/http";
import { setAuthCookies } from "@/server/auth";
import { setPasswordSchema } from "@carebora/shared";
import { authService } from "@carebora/core";

/** POST /api/v1/auth/set-password — consume an invite/reset link, set a password, sign in. */
export const POST = route(async (req) => {
  const input = setPasswordSchema.parse(await req.json());
  const result = await authService.setPassword(input.token, input.password);
  return setAuthCookies(jsonOk(result), result);
});
