import { route, jsonOk } from "@/server/http";
import { providerService } from "@carebora/core";

/** GET /api/v1/providers/:providerId — public profile for a single provider. */
export const GET = route(async (_req, { params }: { params: Promise<{ providerId: string }> }) => {
  const { providerId } = await params;
  const profile = await providerService.getById(providerId);
  return jsonOk(profile);
});
