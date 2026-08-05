import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { createListingSchema } from "@carebora/shared";
import { listingService } from "@carebora/core";

/** GET /api/v1/vendor/listings — this org's catalogue offers. */
export const GET = route(async (req) => {
  const auth = await requireOrgMember(req, { orgType: "pharmacy" });
  const listings = await listingService.listForOrg(auth.orgId);
  return jsonOk({ listings });
});

/** POST /api/v1/vendor/listings — claim an existing drug, or add a new one and claim it. */
export const POST = route(async (req) => {
  const auth = await requireOrgMember(req, { roles: ["owner", "manager"], orgType: "pharmacy" });
  const input = createListingSchema.parse(await req.json());
  const listing = await listingService.create(auth.orgId, input);
  return jsonOk(listing, 201);
});
