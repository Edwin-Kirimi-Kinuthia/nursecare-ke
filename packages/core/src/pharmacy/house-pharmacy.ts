import { db } from "@carebora/db";

/**
 * Care Bora's own pharmacy — the organisation the admin's catalogue listings
 * belong to.
 *
 * The storefront only shows Listings, and a Listing belongs to an approved
 * pharmacy Organization with at least one active branch. Third-party
 * pharmacies get there through /vendors/apply, but at launch there are none,
 * so anything the admin added to the catalogue was invisible to clients with
 * no way to fix it from the admin panel.
 *
 * This provisions a single house org on first use so the admin can sell
 * directly. Real vendors joining later are unaffected: their listings sit
 * alongside this one and the storefront surfaces whichever is cheapest or
 * nearest.
 */
const HOUSE_ORG_NAME = "Care Bora Pharmacy";
export const HOUSE_ORG_SLUG = "care-bora-pharmacy";

/** Nairobi CBD — the house branch's coordinates. A DB trigger derives `geog`
 *  from latitude/longitude, which is what the distance search needs. */
const HOUSE_LAT = -1.286389;
const HOUSE_LNG = 36.817223;
/** Wide enough that distance-filtered searches from anywhere in the country
 *  still find it; a real branch would use its own delivery radius. */
const HOUSE_RADIUS_KM = 1000;

export async function ensureHousePharmacy(ownerUserId: string): Promise<string> {
  const existing = await db.organization.findUnique({
    where: { slug: HOUSE_ORG_SLUG },
    select: { id: true, status: true },
  });

  if (existing) {
    // An admin could have suspended or rejected it from the Vendors tab; a
    // listing is pointless while it is, so put it back to approved.
    if (existing.status !== "approved") {
      await db.organization.update({ where: { id: existing.id }, data: { status: "approved" } });
    }
    await ensureBranch(existing.id);
    return existing.id;
  }

  const org = await db.organization.create({
    data: {
      name: HOUSE_ORG_NAME,
      slug: HOUSE_ORG_SLUG,
      type: "pharmacy",
      status: "approved",
      members: { create: { userId: ownerUserId, role: "owner" } },
    },
    select: { id: true },
  });
  await ensureBranch(org.id);
  return org.id;
}

async function ensureBranch(orgId: string) {
  const branch = await db.orgBranch.findFirst({ where: { orgId }, select: { id: true, isActive: true } });
  if (branch) {
    if (!branch.isActive) {
      await db.orgBranch.update({ where: { id: branch.id }, data: { isActive: true } });
    }
    return;
  }
  await db.orgBranch.create({
    data: {
      orgId,
      name: "Care Bora Pharmacy — Nairobi",
      county: "Nairobi",
      town: "Nairobi",
      latitude: HOUSE_LAT,
      longitude: HOUSE_LNG,
      deliveryRadiusKm: HOUSE_RADIUS_KM,
      isOpen24h: true,
      isActive: true,
    },
  });
}

/** Create or update Care Bora's own listing of a drug. */
export async function upsertHouseListing(
  ownerUserId: string,
  drugId: string,
  price: { priceKes?: number; stockQty?: number },
) {
  if (price.priceKes === undefined && price.stockQty === undefined) return null;

  const orgId = await ensureHousePharmacy(ownerUserId);
  const existing = await db.listing.findFirst({ where: { orgId, drugId }, select: { id: true } });

  if (existing) {
    return db.listing.update({
      where: { id: existing.id },
      data: {
        ...(price.priceKes !== undefined ? { priceKes: price.priceKes } : {}),
        ...(price.stockQty !== undefined ? { stockQty: price.stockQty } : {}),
        isActive: true,
      },
    });
  }

  // A new listing needs a price; stock may legitimately start at zero, which
  // keeps it off the storefront until it's in.
  if (price.priceKes === undefined) return null;
  return db.listing.create({
    data: { orgId, drugId, priceKes: price.priceKes, stockQty: price.stockQty ?? 0 },
  });
}
