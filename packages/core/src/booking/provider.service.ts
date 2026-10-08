import { db, type Prisma } from "@carebora/db";
import { ApiError, type ProvidersQuery } from "@carebora/shared";

/**
 * One definition of "the same specialty", used by both the filter chips and the
 * filter itself so they cannot disagree. Providers type these by hand, so
 * stray spaces and different capitalisation are routine.
 */
function cleanLabel(raw: string | null | undefined): string {
  return (raw ?? "").trim().replace(/\s+/g, " ");
}

export const providerService = {
  /** Paginated, filterable provider directory (defaults to verified providers). */
  async list(query: ProvidersQuery) {
    const where: Prisma.ProviderProfileWhereInput = {};

    if (query.specialty) {
      // Matches the specialty *or* the sub-specialty, exactly. Compared in code
      // after the same cleaning the chips use, rather than with a database
      // equality: "internal medicine " (trailing space) and "Internal Medicine"
      // are one chip with a count of two, so the filter has to treat them as
      // one too or the chip's number and its results disagree. A looser
      // "contains" would instead fold "Medicine" into "Internal Medicine".
      const wanted = cleanLabel(query.specialty).toLowerCase();
      const candidates = await db.providerProfile.findMany({
        select: { userId: true, specialty: true, subSpecialty: true },
      });
      const ids = candidates
        .filter((c) => [c.specialty, c.subSpecialty].some((v) => cleanLabel(v).toLowerCase() === wanted))
        .map((c) => c.userId);
      where.userId = { in: ids };
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

  /**
   * The specialties and sub-specialties that providers on the platform have
   * actually supplied, for the directory's filter chips.
   *
   * Derived rather than hard-coded, the way the pharmacy derives drug
   * categories, so the page never offers a filter nobody can satisfy ("Nursing"
   * with no nurse on the platform) and a new specialty appears the moment a
   * provider enters it.
   *
   * Counts the same set the directory shows — verified providers — so tapping
   * a chip can never come back empty. Case and spacing differences ("internal
   * medicine", " Internal Medicine ") collapse to one chip, labelled with the
   * casing most providers used.
   */
  async specialties() {
    const rows = await db.providerProfile.findMany({
      where: { verificationStatus: "verified" },
      select: { userId: true, specialty: true, subSpecialty: true },
    });

    const groups = new Map<string, { casings: Map<string, number>; providers: Set<string> }>();
    for (const r of rows) {
      for (const raw of [r.specialty, r.subSpecialty]) {
        const label = cleanLabel(raw);
        if (!label) continue;
        const key = label.toLowerCase();
        const g = groups.get(key) ?? { casings: new Map(), providers: new Set() };
        g.casings.set(label, (g.casings.get(label) ?? 0) + 1);
        // A set, so a provider whose specialty and sub-specialty match counts once.
        g.providers.add(r.userId);
        groups.set(key, g);
      }
    }

    return [...groups.values()]
      .map((g) => ({
        name: [...g.casings.entries()].sort((a, b) => b[1] - a[1])[0]![0],
        count: g.providers.size,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
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
