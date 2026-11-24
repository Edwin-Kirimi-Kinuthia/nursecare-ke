import { db, Prisma } from "@carebora/db";
import { ApiError, type CreateServiceReviewInput, type ServiceReviewSubject } from "@carebora/shared";

/** Resolve ownership and recipients from the service itself, never from client input. */
async function subject(patientId: string, input: ServiceReviewSubject) {
  const id = input.subjectId;
  let record: { patientId: string; providerId?: string | null; orgId?: string | null; status: string } | null = null;
  if (input.serviceType === "vendor_order") {
    const order = await db.vendorOrder.findUnique({ where: { id }, include: { order: { select: { patientId: true } } } });
    if (order) record = { ...order, patientId: order.order.patientId };
  } else if (input.serviceType === "home_visit") record = await db.homeVisit.findUnique({ where: { id } });
  else if (input.serviceType === "lab_order") record = await db.labOrder.findUnique({ where: { id } });
  else record = await db.ambulanceRequest.findUnique({ where: { id } });
  if (!record) throw ApiError.notFound("Service not found");
  if (record.patientId !== patientId) throw ApiError.forbidden("You can only review your own services");
  return record;
}

export const serviceReviewService = {
  async get(patientId: string, input: ServiceReviewSubject) {
    await subject(patientId, input);
    return db.serviceReview.findUnique({ where: { serviceType_subjectId: input } });
  },

  async create(patientId: string, input: CreateServiceReviewInput) {
    const record = await subject(patientId, input);
    const finished = input.serviceType === "vendor_order" ? "delivered" : input.serviceType === "lab_order" ? "resulted" : "completed";
    if (record.status !== finished) throw ApiError.badRequest("You can review this service once it is completed");
    if (!record.providerId && !record.orgId) throw ApiError.badRequest("No service provider is assigned to this service");
    for (let attempt = 0; ; attempt++) {
      try {
        return await db.$transaction(async tx => {
          const review = await tx.serviceReview.create({ data: {
            serviceType: input.serviceType, subjectId: input.subjectId, patientId,
            providerId: record.providerId ?? null, orgId: record.orgId ?? null,
            rating: input.rating, comment: input.comment?.trim() || null,
          } });
          if (record.orgId) {
            const stats = await tx.serviceReview.aggregate({ where: { orgId: record.orgId, isVisible: true }, _avg: { rating: true }, _count: { rating: true } });
            await tx.organization.update({ where: { id: record.orgId }, data: { ratingAvg: stats._avg.rating ?? 0, ratingCount: stats._count.rating } });
          }
          if (record.providerId) {
            const where = { providerId: record.providerId, isVisible: true };
            const [a, b] = await Promise.all([
              tx.review.aggregate({ where, _sum: { rating: true }, _count: { rating: true } }),
              tx.serviceReview.aggregate({ where, _sum: { rating: true }, _count: { rating: true } }),
            ]);
            const count = a._count.rating + b._count.rating;
            await tx.providerProfile.update({ where: { userId: record.providerId }, data: { ratingAvg: count ? ((a._sum.rating ?? 0) + (b._sum.rating ?? 0)) / count : 0, ratingCount: count } });
          }
          return review;
        }, { isolationLevel: "Serializable" });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === "P2002") throw ApiError.conflict("You have already reviewed this service");
          if (error.code === "P2034" && attempt < 3) continue;
        }
        throw error;
      }
    }
  },

  async moderate(id: string, isVisible: boolean) {
    return db.$transaction(async tx => {
      const review = await tx.serviceReview.update({ where: { id }, data: { isVisible }, include: { patient: { select: { id: true, fullName: true, avatarUrl: true } } } });
      if (review.orgId) {
        const stats = await tx.serviceReview.aggregate({ where: { orgId: review.orgId, isVisible: true }, _avg: { rating: true }, _count: { rating: true } });
        await tx.organization.update({ where: { id: review.orgId }, data: { ratingAvg: stats._avg.rating ?? 0, ratingCount: stats._count.rating } });
      }
      return review;
    }, { isolationLevel: "Serializable" });
  },
  async listOrganization(orgId: string) {
    if (!await db.organization.findFirst({ where: { id: orgId, status: "approved" }, select: { id: true } })) throw ApiError.notFound("Service organization not found");
    const where = { orgId, isVisible: true };
    const [reviews, stats] = await Promise.all([
      db.serviceReview.findMany({ where, orderBy: { createdAt: "desc" }, take: 50,
        select: { id: true, rating: true, comment: true, createdAt: true, serviceType: true } }),
      db.serviceReview.aggregate({ where, _avg: { rating: true }, _count: { rating: true } }),
    ]);
    return { reviews, ratingAvg: stats._avg.rating ?? 0, ratingCount: stats._count.rating };
  },
};
