import { db } from "@carebora/db";
import { ApiError, type CreateReviewInput, type ModerateReviewInput, type ReviewsQuery } from "@carebora/shared";

const REVIEW_INCLUDE = {
  patient: { select: { id: true, fullName: true, avatarUrl: true } },
  appointment: { select: { id: true, appointmentType: true, slot: { select: { startsAt: true } } } },
} as const;

export const reviewService = {
  async create(patientId: string, appointmentId: string, input: CreateReviewInput) {
    const appt = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: { provider: { include: { user: { select: { email: true, fullName: true } } } } },
    });
    if (!appt) throw ApiError.notFound("Appointment not found");
    if (appt.patientId !== patientId) throw ApiError.forbidden("Not your appointment");
    if (appt.status !== "completed") throw ApiError.badRequest("Can only review completed appointments");

    const existing = await db.review.findUnique({ where: { appointmentId } });
    if (existing) throw ApiError.conflict("You have already reviewed this appointment");

    const review = await db.review.create({
      data: {
        appointmentId,
        patientId,
        providerId: appt.providerId,
        rating: input.rating,
        comment: input.comment ?? null,
      },
      include: REVIEW_INCLUDE,
    });

    const stats = await db.review.aggregate({
      where: { providerId: appt.providerId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await db.providerProfile.update({
      where: { userId: appt.providerId },
      data: {
        ratingAvg: stats._avg.rating ?? 0,
        ratingCount: stats._count.rating,
      },
    });

    return { review, provider: appt.provider };
  },

  async listByProvider(providerId: string, query: ReviewsQuery) {
    const where = { providerId, isVisible: query.isVisible ?? true };
    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        include: REVIEW_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: query.limit,
        skip: query.offset,
      }),
      db.review.count({ where }),
    ]);
    return { reviews, total, limit: query.limit, offset: query.offset };
  },

  /**
   * The most recent genuinely positive reviews, for the home page.
   *
   * Every one is a patient's review of a completed appointment — the home page
   * used to show hard-coded testimonials from people who did not exist. Only
   * 4★ and above with some words are returned, visible ones only (an admin can
   * hide a review), and the reviewer is reduced to a first name and surname
   * initial because this is shown to anyone, signed in or not.
   */
  async featured(limit = 3) {
    const rows = await db.review.findMany({
      where: {
        isVisible: true, rating: { gte: 4 }, comment: { not: null },
        provider: { user: { isActive: true, deletedAt: null } },
        patient: { deletedAt: null },
      },
      orderBy: { createdAt: "desc" },
      take: limit * 3,
      select: {
        id: true, rating: true, comment: true, createdAt: true,
        patient: { select: { fullName: true } },
        provider: { select: { userId: true, user: { select: { fullName: true } } } },
      },
    });
    const short = (full: string) => {
      const parts = full.trim().split(/\s+/);
      return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]![0]}.` : parts[0] ?? "A patient";
    };
    return rows
      .filter((r) => (r.comment ?? "").trim().length >= 10)
      .slice(0, limit)
      .map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment!.trim(),
        reviewer: short(r.patient.fullName),
        providerId: r.provider.userId,
        providerName: r.provider.user.fullName,
        createdAt: r.createdAt,
      }));
  },

  async adminList(query: ReviewsQuery) {
    const where = query.isVisible !== undefined ? { isVisible: query.isVisible } : {};
    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        include: {
          ...REVIEW_INCLUDE,
          provider: { select: { userId: true, specialty: true, user: { select: { fullName: true, email: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: query.limit,
        skip: query.offset,
      }),
      db.review.count({ where }),
    ]);
    return { reviews, total, limit: query.limit, offset: query.offset };
  },

  async moderate(reviewId: string, input: ModerateReviewInput) {
    const review = await db.review.findUnique({ where: { id: reviewId } });
    if (!review) throw ApiError.notFound("Review not found");
    const updated = await db.review.update({
      where: { id: reviewId },
      data: { isVisible: input.isVisible },
      include: REVIEW_INCLUDE,
    });
    const stats = await db.review.aggregate({
      where: { providerId: review.providerId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await db.providerProfile.update({
      where: { userId: review.providerId },
      data: { ratingAvg: stats._avg.rating ?? 0, ratingCount: stats._count.rating },
    });
    return updated;
  },
};
