import { route, jsonOk } from "@/server/http";
import { requestMeta, setAuthCookies } from "@/server/auth";
import { loginVerifyOtpSchema } from "@carebora/shared";
import { authService } from "@carebora/core";

/** POST /api/v1/auth/login/verify-otp — step 2 of login: confirm the emailed code and start the session. */
export const POST = route(async (req) => {
  const input = loginVerifyOtpSchema.parse(await req.json());
  const result = await authService.verifyLoginOtp(input.email, input.code, requestMeta(req));
  return setAuthCookies(jsonOk(result), result);
});
