import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { patchMeSchema } from "@carebora/shared";
import { authService } from "@carebora/core";

/** GET /api/v1/auth/me — the authenticated user and their profile. */
export const GET = route(async (req) => {
  const auth = await requireAuth(req);
  const profile = await authService.getProfile(auth.sub);
  return jsonOk(profile);
});

/**
 * PATCH /api/v1/auth/me — update your own name, phone or profile photo.
 *
 * Open to every role: these are account fields, not role-specific ones. A
 * provider's photo is what clients see on their public profile.
 */
export const PATCH = route(async (req) => {
  const auth = await requireAuth(req);
  const input = patchMeSchema.parse(await req.json());
  const profile = await authService.patchMe(auth.sub, input);
  return jsonOk(profile);
});
