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

/**
 * Photos are stored as base64 data: URLs, which are fine in a row but ruinous
 * inside a page: a directory of twenty providers would embed megabytes of text
 * in the HTML. Public responses point at the avatar route instead, versioned by
 * the user's last update so the long cache lifetime never serves a stale photo.
 */
function publicAvatar(userId: string, avatarUrl: string | null, updatedAt: Date): string | null {
  if (!avatarUrl) return null;
  return avatarUrl.startsWith("data:") ? `/api/v1/providers/${userId}/avatar?v=${updatedAt.getTime()}` : avatarUrl;
}

const PUBLIC_USER = { select: { id: true, fullName: true, avatarUrl: true, role: true, updatedAt: true, deletedAt: true } } as const;

function withPublicAvatar<T extends { user: { id: string; avatarUrl: string | null; updatedAt: Date } }>(p: T) {
  const { updatedAt, ...user } = p.user;
  return { ...p, user: { ...user, avatarUrl: publicAvatar(user.id, user.avatarUrl, updatedAt) } };
}

async function withActivity<T extends { userId: string }>(profiles: T[]) {
  const ids = profiles.map(p => p.userId);
  if (!ids.length) return [];
  const [appointments, visits, ratings, serviceRatings] = await Promise.all([
    db.appointment.groupBy({ by: ["providerId", "appointmentType"], where: { providerId: { in: ids }, status: "completed" }, _count: { _all: true } }),
    db.homeVisit.groupBy({ by: ["providerId"], where: { providerId: { in: ids }, status: "completed" }, _count: { _all: true } }),
    db.review.groupBy({ by: ["providerId"], where: { providerId: { in: ids }, isVisible: true }, _sum: { rating: true }, _count: { rating: true } }),
    db.serviceReview.groupBy({ by: ["providerId"], where: { providerId: { in: ids }, isVisible: true }, _sum: { rating: true }, _count: { rating: true } }),
  ]);
  return profiles.map(p => {
    const completedConsultations = appointments.filter(a => a.providerId === p.userId && a.appointmentType !== "home_visit").reduce((n,a) => n+a._count._all,0);
    const completedHomeVisits = appointments.filter(a => a.providerId === p.userId && a.appointmentType === "home_visit").reduce((n,a) => n+a._count._all,0) + (visits.find(v => v.providerId === p.userId)?._count._all ?? 0);
    const scores = [...ratings, ...serviceRatings].filter(r => r.providerId === p.userId);
    const ratingCount = scores.reduce((n,r) => n+r._count.rating,0);
    const ratingAvg = ratingCount ? scores.reduce((n,r) => n+(r._sum.rating ?? 0),0)/ratingCount : 0;
    return { ...p, completedConsultations, completedHomeVisits, completedServices: completedConsultations+completedHomeVisits, ratingAvg, ratingCount };
  });
}

export const providerService = {
  /** Paginated, filterable provider directory (defaults to verified providers). */
  async list(query: ProvidersQuery) {
    const where: Prisma.ProviderProfileWhereInput = {
      user: { isActive: true, deletedAt: null },
    };

    if (query.specialty) {
      // Matches the specialty *or* the sub-specialty, exactly. Compared in code
      // after the same cleaning the chips use, rather than with a database
      // equality: "internal medicine " (trailing space) and "Internal Medicine"
      // are one chip with a count of two, so the filter has to treat them as
      // one too or the chip's number and its results disagree. A looser
      // "contains" would instead fold "Medicine" into "Internal Medicine".
      const wanted = cleanLabel(query.specialty).toLowerCase();
      const candidates = await db.providerProfile.findMany({
        where: { user: { isActive: true, deletedAt: null } },
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
        include: { user: PUBLIC_USER },
        orderBy: [{ ratingAvg: "desc" }, { createdAt: "asc" }],

      }),
      db.providerProfile.count({ where }),
    ]);

    const ranked = (await withActivity(providers)).sort((a,b) => b.ratingAvg-a.ratingAvg || b.completedServices-a.completedServices || b.ratingCount-a.ratingCount || a.userId.localeCompare(b.userId));
    return { providers: ranked.slice(query.offset, query.offset+query.limit).map(withPublicAvatar), total, limit: query.limit, offset: query.offset };
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
      where: { verificationStatus: "verified", user: { isActive: true, deletedAt: null } },
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
      where: { userId: providerId, user: { isActive: true, deletedAt: null } },
      include: { user: PUBLIC_USER },
    });
    if (!profile || profile.user.deletedAt) throw ApiError.notFound("Provider not found");
    return withPublicAvatar((await withActivity([profile]))[0]!);
  },
};
