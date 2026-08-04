import { route, jsonOk } from "@/server/http";
import { offersQuerySchema } from "@carebora/shared";
import { storefrontService } from "@carebora/core";

/** GET /api/v1/storefront/drugs/:drugId/offers — every vendor's offer, ranked by distance then price. */
export const GET = route(async (req, { params }: { params: Promise<{ drugId: string }> }) => {
  const { drugId } = await params;
  const query = offersQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const result = await storefrontService.getOffers(drugId, query);
  return jsonOk(result);
});
