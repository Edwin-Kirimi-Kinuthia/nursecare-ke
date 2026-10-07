import { route, jsonOk } from "@/server/http";
import { loginSchema } from "@carebora/shared";
import { authService } from "@carebora/core";

/** POST /api/v1/auth/login — verify credentials, then email a 6-digit code (no session yet). */
export const POST = route(async (req) => {
  const input = loginSchema.parse(await req.json());
  const result = await authService.login(input);
  return jsonOk(result);
});
