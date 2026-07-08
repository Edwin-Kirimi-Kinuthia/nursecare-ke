import { route, jsonOk } from "@/server/http";
import { requestMeta, setAuthCookies } from "@/server/auth";
import { providerApplicationSchema } from "@carebora/shared";
import { authService } from "@carebora/core";

/** POST /api/v1/providers/apply — apply to join as a healthcare provider (pending review). */
export const POST = route(async (req) => {
  const input = providerApplicationSchema.parse(await req.json());
  const result = await authService.applyAsProvider(input, requestMeta(req));
  return setAuthCookies(jsonOk(result, 201), result);
});
