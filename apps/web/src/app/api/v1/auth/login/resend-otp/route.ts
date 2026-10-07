import { route, jsonOk } from "@/server/http";
import { loginResendOtpSchema } from "@carebora/shared";
import { authService } from "@carebora/core";

/** POST /api/v1/auth/login/resend-otp — resend the login code, only if an attempt is actually in progress. */
export const POST = route(async (req) => {
  const input = loginResendOtpSchema.parse(await req.json());
  const result = await authService.resendLoginOtp(input.email);
  return jsonOk(result);
});
