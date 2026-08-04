import { db, type Prisma } from "@carebora/db";
import { ApiError, type CreateDrugInput, type DrugsQuery, type UpdateDrugInput } from "@carebora/shared";

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

  async remove(drugId: string) {
    const drug = await db.drug.findUnique({ where: { id: drugId } });
    if (!drug) throw ApiError.notFound("Drug not found");
    return db.drug.update({ where: { id: drugId }, data: { isActive: false } });
  },
};
