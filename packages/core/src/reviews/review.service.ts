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
