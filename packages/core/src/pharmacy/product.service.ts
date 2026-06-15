import { db, type Prisma } from "@carebora/db";
import { ApiError, type ProductsQuery } from "@carebora/shared";

export const productService = {
  async list(query: ProductsQuery) {
    const where: Prisma.ProductWhereInput = { isActive: true };

    if (query.category) {
      where.category = { equals: query.category, mode: "insensitive" };
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { genericName: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }
    if (query.requiresPrescription !== undefined) {
      where.requiresPrescription = query.requiresPrescription;
    }
    if (query.inStock) {
      where.stockQty = { gt: 0 };
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: { name: "asc" },
        skip: query.offset,
        take: query.limit,
      }),
      db.product.count({ where }),
    ]);

    return { products, total, limit: query.limit, offset: query.offset };
  },

  async getById(productId: string) {
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) throw ApiError.notFound("Product not found");
    return product;
  },
};
