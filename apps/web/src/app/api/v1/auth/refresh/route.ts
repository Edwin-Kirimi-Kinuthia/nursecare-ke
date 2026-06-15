import { route, jsonOk } from "@/server/http";
import { requestMeta, readRefreshCookie, setAuthCookies } from "@/server/auth";
import { refreshSchema } from "@carebora/shared";
import { authService } from "@carebora/core";

/**
 * POST /api/v1/auth/refresh — rotate a refresh token, issue new token pair.
 *
 * Web clients: token is read from the httpOnly cb_refresh cookie (body omitted).
 * Mobile clients: send { refreshToken } in the JSON body (no cookie).
 */
export const POST = route(async (req) => {
  const body = refreshSchema.parse(await req.json().catch(() => ({})));
  const rawToken = readRefreshCookie(req) ?? body.refreshToken ?? null;
  const result = await authService.refresh(rawToken, requestMeta(req));
  return setAuthCookies(jsonOk(result), result);
});
