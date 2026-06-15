import { db, type Prisma } from "@carebora/db";
import { ApiError, type ProvidersQuery } from "@carebora/shared";

export const providerService = {
  /** Paginated, filterable provider directory (defaults to verified providers). */
  async list(query: ProvidersQuery) {
    const where: Prisma.ProviderProfileWhereInput = {};

    if (query.specialty) {
      where.specialty = { contains: query.specialty, mode: "insensitive" };
    }
    if (query.county) {
      where.county = { equals: query.county, mode: "insensitive" };
    }
    if (query.verified !== undefined) {
      if (query.verified) where.verificationStatus = "verified";
      // verified=false → no status filter (show all)
    } else {
      where.verificationStatus = "verified"; // default: only show verified
    }
    if (query.available !== undefined) {
      where.isAvailable = query.available;
    }

    const [providers, total] = await Promise.all([
      db.providerProfile.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, avatarUrl: true, role: true } } },
        orderBy: [{ ratingAvg: "desc" }, { createdAt: "asc" }],
        skip: query.offset,
        take: query.limit,
      }),
      db.providerProfile.count({ where }),
    ]);

    return { providers, total, limit: query.limit, offset: query.offset };
  },

  /** Full public profile for a single provider by their user ID. */
  async getById(providerId: string) {
    const profile = await db.providerProfile.findUnique({
      where: { userId: providerId },
      include: { user: { select: { id: true, fullName: true, avatarUrl: true, role: true } } },
    });
    if (!profile) throw ApiError.notFound("Provider not found");
    return profile;
  },
};
