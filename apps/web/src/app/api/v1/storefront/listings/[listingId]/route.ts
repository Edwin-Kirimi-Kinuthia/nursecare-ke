import { route, jsonOk } from "@/server/http";
import { storefrontService } from "@carebora/core";

/** GET /api/v1/storefront/listings/:listingId — a single listing (drug + vendor). No auth required. */
export const GET = route(async (_req, { params }: { params: Promise<{ listingId: string }> }) => {
  const { listingId } = await params;
  const listing = await storefrontService.getListing(listingId);
  return jsonOk(listing);
});
