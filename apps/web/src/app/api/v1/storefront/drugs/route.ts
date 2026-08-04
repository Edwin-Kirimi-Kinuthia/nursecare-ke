import { route, jsonOk } from "@/server/http";
import { storefrontQuerySchema } from "@carebora/shared";
import { storefrontService } from "@carebora/core";

/**
 * GET /api/v1/storefront/drugs — browse the marketplace, ranked by distance
 * from (lat, lng) when given, else by price. No auth required.
 */
export const GET = route(async (req) => {
  const query = storefrontQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const result = await storefrontService.searchDrugs(query);
  return jsonOk(result);
});
