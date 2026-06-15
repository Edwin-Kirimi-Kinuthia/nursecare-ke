import { route, jsonOk } from "@/server/http";
import { requestMeta, setAuthCookies } from "@/server/auth";
import { loginSchema } from "@carebora/shared";
import { authService } from "@carebora/core";

/** POST /api/v1/auth/login — verify credentials and start a session. */
export const POST = route(async (req) => {
  const input = loginSchema.parse(await req.json());
  const result = await authService.login(input, requestMeta(req));
  return setAuthCookies(jsonOk(result), result);
});
