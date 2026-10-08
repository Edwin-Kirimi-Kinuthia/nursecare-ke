import { route, jsonOk } from "@/server/http";
import { providerService } from "@carebora/core";

/** GET /api/v1/providers/specialties — the specialties providers have actually supplied. */
export const GET = route(async () => {
  return jsonOk({ specialties: await providerService.specialties() });
});
