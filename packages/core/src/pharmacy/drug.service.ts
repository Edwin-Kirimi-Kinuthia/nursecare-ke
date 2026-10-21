import { db, type Prisma } from "@carebora/db";
import {
  ApiError,
  type AdminCreateDrugInput,
  type AdminUpdateDrugInput,
  type CreateDrugInput,
  type DrugsQuery,
  type UpdateDrugInput,
} from "@carebora/shared";
import { HOUSE_ORG_SLUG, upsertHouseListing } from "./house-pharmacy";


/** The canonical, shared medication catalogue — admin-curated, browsed via the storefront. */
export const drugService = {
  async list(query: DrugsQuery) {
    const where: Prisma.DrugWhereInput = { isActive: true };
    if (query.category) where.category = { equals: query.category, mode: "insensitive" };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { genericName: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }
    if (query.requiresPrescription !== undefined) where.requiresPrescription = query.requiresPrescription;

    const [drugs, total] = await Promise.all([
      db.drug.findMany({ where, orderBy: { name: "asc" }, skip: query.offset, take: query.limit }),
      db.drug.count({ where }),
    ]);
    return { drugs, total, limit: query.limit, offset: query.offset };
  },

  async getById(drugId: string) {
    const drug = await db.drug.findUnique({ where: { id: drugId } });
    if (!drug || !drug.isActive) throw ApiError.notFound("Drug not found");
    return drug;
  },

  /** Finds an active drug by exact (case-insensitive) name — used when a vendor claims a new listing. */
  async findByName(name: string) {
    return db.drug.findFirst({ where: { name: { equals: name, mode: "insensitive" }, isActive: true } });
  },

  async create(input: CreateDrugInput) {
    const imageUrl = input.images?.[0] ?? input.imageUrl;
    return db.drug.create({ data: { ...input, imageUrl } });
  },

  async update(drugId: string, input: UpdateDrugInput) {
    const drug = await db.drug.findUnique({ where: { id: drugId } });
    if (!drug) throw ApiError.notFound("Drug not found");
    const imageUrl = input.images !== undefined ? (input.images[0] ?? null) : input.imageUrl;
    return db.drug.update({ where: { id: drugId }, data: { ...input, imageUrl } });
  },

  /**
   * Admin create: the catalogue entry *and* Care Bora's listing of it, so the
   * drug is actually on sale. Adding only the catalogue entry — which is all
   * this used to do — left it invisible to every client.
   */
  async adminCreate(adminUserId: string, input: AdminCreateDrugInput) {
    const { priceKes, stockQty, ...drugFields } = input;
    const drug = await this.create(drugFields);
    const listing = await upsertHouseListing(adminUserId, drug.id, { priceKes, stockQty });
    return { ...drug, priceKes: listing?.priceKes ?? null, stockQty: listing?.stockQty ?? null };
  },

  /** Admin update: catalogue fields, plus the house listing's price and stock. */
  async adminUpdate(adminUserId: string, drugId: string, input: AdminUpdateDrugInput) {
    const { priceKes, stockQty, ...drugFields } = input;
    const drug = await this.update(drugId, drugFields);
    const listing = await upsertHouseListing(adminUserId, drugId, { priceKes, stockQty });
    return { ...drug, priceKes: listing?.priceKes ?? null, stockQty: listing?.stockQty ?? null };
  },

  /**
   * Admin catalogue list, each row carrying Care Bora's own price and stock
   * plus how many other pharmacies list it — so the admin can see at a glance
   * whether a drug is actually purchasable.
   */
  async adminList(query: DrugsQuery) {
    const base = await this.list(query);
    const listings = await db.listing.findMany({
      where: { drugId: { in: base.drugs.map((d) => d.id) } },
      select: { drugId: true, priceKes: true, stockQty: true, isActive: true, organization: { select: { slug: true, status: true } } },
    });

    const drugs = base.drugs.map((d) => {
      const own = listings.filter((l) => l.drugId === d.id);
      const house = own.find((l) => l.organization.slug === HOUSE_ORG_SLUG);
      const sellable = own.filter((l) => l.isActive && l.stockQty > 0 && l.organization.status === "approved");
      return {
        ...d,
        priceKes: house?.priceKes ?? null,
        stockQty: house?.stockQty ?? null,
        /** How many pharmacies a client could actually buy this from right now. */
        sellerCount: sellable.length,
      };
    });
    return { ...base, drugs };
  },

  async remove(drugId: string) {
    const drug = await db.drug.findUnique({ where: { id: drugId } });
    if (!drug) throw ApiError.notFound("Drug not found");
    return db.drug.update({ where: { id: drugId }, data: { isActive: false } });
  },
};
