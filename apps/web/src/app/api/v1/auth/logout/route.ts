import { route, jsonOk } from "@/server/http";
import { readRefreshCookie, clearAuthCookies } from "@/server/auth";
import { refreshSchema } from "@carebora/shared";
import { authService } from "@carebora/core";

/**
 * POST /api/v1/auth/logout — revoke the current session.
 *
 * Web clients: refresh token read from the httpOnly cb_refresh cookie.
 * Mobile clients: send { refreshToken } in the JSON body.
 */
export const POST = route(async (req) => {
  const body = refreshSchema.parse(await req.json().catch(() => ({})));
  const rawToken = readRefreshCookie(req) ?? body.refreshToken ?? null;
  await authService.logout(rawToken);
  return clearAuthCookies(jsonOk({ loggedOut: true }));
});
