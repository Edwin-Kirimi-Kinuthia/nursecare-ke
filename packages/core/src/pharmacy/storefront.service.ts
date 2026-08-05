import { db } from "@carebora/db";
import { ApiError, type StorefrontQuery, type OffersQuery } from "@carebora/shared";

interface OfferRow {
  drugId: string;
  drugName: string;
  category: string;
  imageUrl: string | null;
  requiresPrescription: boolean;
  listingId: string;
  priceKes: number;
  stockQty: number;
  orgId: string;
  orgName: string;
  branchId: string;
  branchName: string;
  county: string;
  distanceKm: number | null;
}

/**
 * Raw rows joining Drug → Listing → Organization → OrgBranch, one row per
 * (drug, vendor branch) offer. When lat/lng are given, `distanceKm` is computed
 * via PostGIS `ST_Distance` over the branch's geography column; otherwise null
 * and the caller falls back to a county-equality / price ranking.
 */
async function queryOffers(opts: {
  drugId?: string;
  category?: string;
  search?: string;
  requiresPrescription?: boolean;
  county?: string;
  lat?: number;
  lng?: number;
}): Promise<OfferRow[]> {
  const categoryFilter = opts.category ?? null;
  const searchFilter = opts.search ? `%${opts.search}%` : null;
  const rxFilter = opts.requiresPrescription ?? null;
  const countyFilter = opts.county ?? null;
  const drugIdFilter = opts.drugId ?? null;

  if (opts.lat !== undefined && opts.lng !== undefined) {
    return db.$queryRaw<OfferRow[]>`
      SELECT
        d.id AS "drugId", d.name AS "drugName", d.category, d.image_url AS "imageUrl",
        d.requires_prescription AS "requiresPrescription",
        l.id AS "listingId", l.price_kes AS "priceKes", l.stock_qty AS "stockQty",
        o.id AS "orgId", o.name AS "orgName",
        b.id AS "branchId", b.name AS "branchName", b.county,
        round((ST_Distance(b.geog, ST_SetSRID(ST_MakePoint(${opts.lng}, ${opts.lat}), 4326)::geography) / 1000)::numeric, 2)::float AS "distanceKm"
      FROM listings l
      JOIN drugs d ON d.id = l.drug_id
      JOIN organizations o ON o.id = l.org_id
      JOIN org_branches b ON b.org_id = o.id
      WHERE l.is_active = true AND l.stock_qty > 0
        AND d.is_active = true
        AND o.type = 'pharmacy' AND o.status = 'approved'
        AND b.is_active = true
        AND (${drugIdFilter}::uuid IS NULL OR d.id = ${drugIdFilter}::uuid)
        AND (${categoryFilter}::text IS NULL OR d.category ILIKE ${categoryFilter})
        AND (${searchFilter}::text IS NULL OR d.name ILIKE ${searchFilter} OR d.generic_name ILIKE ${searchFilter})
        AND (${rxFilter}::boolean IS NULL OR d.requires_prescription = ${rxFilter})
        AND ST_DWithin(b.geog, ST_SetSRID(ST_MakePoint(${opts.lng}, ${opts.lat}), 4326)::geography, b.delivery_radius_km * 1000)
      ORDER BY "distanceKm" ASC, l.price_kes ASC
    `;
  }

  return db.$queryRaw<OfferRow[]>`
    SELECT
      d.id AS "drugId", d.name AS "drugName", d.category, d.image_url AS "imageUrl",
      d.requires_prescription AS "requiresPrescription",
      l.id AS "listingId", l.price_kes AS "priceKes", l.stock_qty AS "stockQty",
      o.id AS "orgId", o.name AS "orgName",
      b.id AS "branchId", b.name AS "branchName", b.county,
      NULL::float AS "distanceKm"
    FROM listings l
    JOIN drugs d ON d.id = l.drug_id
    JOIN organizations o ON o.id = l.org_id
    JOIN org_branches b ON b.org_id = o.id
    WHERE l.is_active = true AND l.stock_qty > 0
      AND d.is_active = true
      AND o.type = 'pharmacy' AND o.status = 'approved'
      AND b.is_active = true
      AND (${drugIdFilter}::uuid IS NULL OR d.id = ${drugIdFilter}::uuid)
      AND (${categoryFilter}::text IS NULL OR d.category ILIKE ${categoryFilter})
      AND (${searchFilter}::text IS NULL OR d.name ILIKE ${searchFilter} OR d.generic_name ILIKE ${searchFilter})
      AND (${rxFilter}::boolean IS NULL OR d.requires_prescription = ${rxFilter})
      AND (${countyFilter}::text IS NULL OR b.county = ${countyFilter})
    ORDER BY l.price_kes ASC
  `;
}

export const storefrontService = {
  /** A single listing (with its drug + vendor org name) — used to hydrate cart line items. */
  async getListing(listingId: string) {
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      include: { drug: true, organization: { select: { id: true, name: true } } },
    });
    if (!listing || !listing.isActive) throw ApiError.notFound("Listing not found");
    return listing;
  },


  /** Drug listing for the buyer-facing storefront, grouped by drug with the nearest/cheapest offer surfaced. */
  async searchDrugs(query: StorefrontQuery) {
    const rows = await queryOffers({
      category: query.category,
      search: query.search,
      requiresPrescription: query.requiresPrescription,
      county: query.county,
      lat: query.lat,
      lng: query.lng,
    });

    const byDrug = new Map<string, OfferRow[]>();
    for (const row of rows) {
      const list = byDrug.get(row.drugId) ?? [];
      list.push(row);
      byDrug.set(row.drugId, list);
    }

    const grouped = [...byDrug.values()].map((offers) => {
      const cheapest = offers.reduce((a, b) => (b.priceKes < a.priceKes ? b : a));
      const nearest = query.lat !== undefined
        ? offers.reduce((a, b) => ((b.distanceKm ?? Infinity) < (a.distanceKm ?? Infinity) ? b : a))
        : cheapest;
      const vendorCount = new Set(offers.map((o) => o.orgId)).size;
      return {
        drugId: nearest.drugId,
        name: nearest.drugName,
        category: nearest.category,
        imageUrl: nearest.imageUrl,
        requiresPrescription: nearest.requiresPrescription,
        bestPriceKes: cheapest.priceKes,
        vendorCount,
        // The surfaced listing — "Add to cart" on the storefront adds this one directly.
        listingId: nearest.listingId,
        stockQty: nearest.stockQty,
        nearestVendor: {
          orgId: nearest.orgId,
          orgName: nearest.orgName,
          branchName: nearest.branchName,
          county: nearest.county,
          distanceKm: nearest.distanceKm,
        },
      };
    });

    grouped.sort((a, b) =>
      query.lat !== undefined
        ? (a.nearestVendor.distanceKm ?? Infinity) - (b.nearestVendor.distanceKm ?? Infinity)
        : a.bestPriceKes - b.bestPriceKes,
    );

    const total = grouped.length;
    const page = grouped.slice(query.offset, query.offset + query.limit);
    return { drugs: page, total, limit: query.limit, offset: query.offset };
  },

  /** Every vendor offer of one drug, ranked by distance (if known) then price. */
  async getOffers(drugId: string, query: OffersQuery) {
    const drug = await db.drug.findUnique({ where: { id: drugId } });
    if (!drug || !drug.isActive) throw ApiError.notFound("Drug not found");

    const rows = await queryOffers({ drugId, lat: query.lat, lng: query.lng });
    return {
      drug,
      offers: rows.map((r) => ({
        listingId: r.listingId,
        priceKes: r.priceKes,
        stockQty: r.stockQty,
        orgId: r.orgId,
        orgName: r.orgName,
        branchName: r.branchName,
        county: r.county,
        distanceKm: r.distanceKm,
      })),
    };
  },
};
