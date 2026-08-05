import { db } from "@carebora/db";
import { ApiError, type CreateListingInput, type PatchListingInput } from "@carebora/shared";
import { drugService } from "./drug.service";

const LISTING_INCLUDE = { drug: true } as const;

export const listingService = {
  async listForOrg(orgId: string) {
    return db.listing.findMany({
      where: { orgId },
      include: LISTING_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  },

  /** Claims an existing drug, or creates a new one and claims it, in one step. */
  async create(orgId: string, input: CreateListingInput) {
    let drugId = input.drugId;
    if (!drugId) {
      const existing = await drugService.findByName(input.drug!.name);
      drugId = existing ? existing.id : (await drugService.create(input.drug!)).id;
    } else {
      await drugService.getById(drugId); // throws 404 if missing/inactive
    }

    const existingListing = await db.listing.findUnique({ where: { orgId_drugId: { orgId, drugId } } });
    if (existingListing) {
      throw ApiError.conflict("You already have a listing for this drug — edit it instead");
    }

    return db.listing.create({
      data: { orgId, drugId, priceKes: input.priceKes, stockQty: input.stockQty },
      include: LISTING_INCLUDE,
    });
  },

  /** Also used to deactivate a listing (isActive: false) — mirrors the OrgBranch pattern. */
  async patch(orgId: string, listingId: string, input: PatchListingInput) {
    const listing = await db.listing.findFirst({ where: { id: listingId, orgId } });
    if (!listing) throw ApiError.notFound("Listing not found");
    return db.listing.update({ where: { id: listingId }, data: input, include: LISTING_INCLUDE });
  },
};
