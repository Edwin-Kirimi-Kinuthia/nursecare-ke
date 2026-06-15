import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { PROVIDER_ROLES, patchProviderProfileSchema } from "@carebora/shared";
import { profileService } from "@carebora/core";

/** GET /api/v1/providers/me/profile — return the authenticated provider's profile. */
export const GET = route(async (req) => {
  const auth = await requireAuth(req, PROVIDER_ROLES);
  const profile = await profileService.getProvider(auth.sub);
  return jsonOk(profile);
});

/** PATCH /api/v1/providers/me/profile — update the authenticated provider's profile. */
export const PATCH = route(async (req) => {
  const auth = await requireAuth(req, PROVIDER_ROLES);
  const data = patchProviderProfileSchema.parse(await req.json());
  const profile = await profileService.patchProvider(auth.sub, data);
  return jsonOk(profile);
});
