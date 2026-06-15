import { route, jsonOk } from "@/server/http";
import { requestMeta, setAuthCookies } from "@/server/auth";
import { registerSchema } from "@carebora/shared";
import { authService } from "@carebora/core";

/** POST /api/v1/auth/register — create a patient or provider account. */
export const POST = route(async (req) => {
  const input = registerSchema.parse(await req.json());
  const result = await authService.register(input, requestMeta(req));
  return setAuthCookies(jsonOk(result, 201), result);
});
