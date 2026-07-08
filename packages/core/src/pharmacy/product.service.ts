import { db, type Prisma } from "@carebora/db";
import { ApiError, type CreateProductInput, type ProductsQuery, type UpdateProductInput } from "@carebora/shared";

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

  async create(input: CreateProductInput) {
    // Keep imageUrl (used in cards/lists) as the first gallery image.
    const imageUrl = input.images?.[0] ?? input.imageUrl;
    return db.product.create({ data: { ...input, imageUrl } });
  },

  async update(productId: string, input: UpdateProductInput) {
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound("Product not found");
    const imageUrl = input.images !== undefined ? (input.images[0] ?? null) : input.imageUrl;
    return db.product.update({ where: { id: productId }, data: { ...input, imageUrl } });
  },

  async remove(productId: string) {
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound("Product not found");
    return db.product.update({ where: { id: productId }, data: { isActive: false } });
  },
};
