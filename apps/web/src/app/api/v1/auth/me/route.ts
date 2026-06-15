import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { authService } from "@carebora/core";

/** GET /api/v1/auth/me — the authenticated user and their profile. */
export const GET = route(async (req) => {
  const auth = await requireAuth(req);
  const profile = await authService.getProfile(auth.sub);
  return jsonOk(profile);
});
