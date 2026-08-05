import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { patchListingSchema } from "@carebora/shared";
import { listingService } from "@carebora/core";

/** PATCH /api/v1/vendor/listings/:listingId — update price/stock, or deactivate. */
export const PATCH = route(async (req, { params }: { params: Promise<{ listingId: string }> }) => {
  const auth = await requireOrgMember(req, { roles: ["owner", "manager"], orgType: "pharmacy" });
  const { listingId } = await params;
  const input = patchListingSchema.parse(await req.json());
  const listing = await listingService.patch(auth.orgId, listingId, input);
  return jsonOk(listing);
});
