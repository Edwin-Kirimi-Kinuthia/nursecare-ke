import { route, jsonOk } from "@/server/http";
import { forgotPasswordSchema } from "@carebora/shared";
import { authService } from "@carebora/core";

/** POST /api/v1/auth/forgot-password — email a reset link if the address is registered. */
export const POST = route(async (req) => {
  const input = forgotPasswordSchema.parse(await req.json());
  const result = await authService.forgotPassword(input.email);
  return jsonOk(result);
});
