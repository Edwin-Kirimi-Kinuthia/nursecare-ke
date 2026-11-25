import { db } from "@carebora/db";
import { ApiError } from "@carebora/shared";
import { notificationService } from "../notifications/notification.service";
import { inAppNotifications } from "../notifications/inapp.service";

export const reviewInvitationService = {
  async send(input: { subjectType: string; subjectId: string; patientId: string; serviceName: string; path: string }) {
    const patient = await db.user.findFirst({ where: { id: input.patientId, isActive: true, deletedAt: null }, select: { email: true, fullName: true } });
    if (!patient) throw ApiError.notFound("Client account not found");
    await db.reviewInvitation.createMany({ data: { subjectType: input.subjectType, subjectId: input.subjectId }, skipDuplicates: true });
    const invitation = await db.reviewInvitation.findUniqueOrThrow({ where: { subjectType_subjectId: { subjectType: input.subjectType, subjectId: input.subjectId } } });
    if (invitation.emailSentAt) return { ok: true, status: "already_sent" as const };
    const now = new Date();
    const claimed = await db.reviewInvitation.updateMany({ where: { id: invitation.id, emailSentAt: null, OR: [{ claimUntil: null }, { claimUntil: { lt: now } }] }, data: { claimUntil: new Date(now.getTime()+300000) } });
    if (!claimed.count) throw ApiError.conflict("This review email is being sent. Please wait before trying again.");
    try {
      await notificationService.reviewInvitation({ email: patient.email, fullName: patient.fullName, serviceName: input.serviceName, path: input.path, idempotencyKey: `review-${invitation.id}` });
      await db.reviewInvitation.update({ where: { id: invitation.id }, data: { emailSentAt: new Date(), claimUntil: null } });
      await inAppNotifications.create(input.patientId, { type: "service_review_requested", title: "How was your experience?", body: `Please review ${input.serviceName}.`, link: input.path, eventKey: `review-email:${input.subjectType}:${input.subjectId}` });
      return { ok: true, status: "sent" as const };
    } catch (error) {
      await db.reviewInvitation.updateMany({ where: { id: invitation.id, emailSentAt: null }, data: { claimUntil: null } });
      throw error;
    }
  },
  async forProvider(providerId: string, input: { serviceType: "appointment" | "home_visit"; subjectId: string }) {
    const record = input.serviceType === "appointment" ? await db.appointment.findUnique({ where: { id: input.subjectId } }) : await db.homeVisit.findUnique({ where: { id: input.subjectId } });
    if (!record || record.providerId !== providerId) throw ApiError.notFound("Visit not found");
    if (record.status !== "completed") throw ApiError.badRequest("Complete this visit before requesting a review");
    const reviewed = input.serviceType === "appointment" ? await db.review.findUnique({ where: { appointmentId: input.subjectId } }) : await db.serviceReview.findUnique({ where: { serviceType_subjectId: { serviceType: "home_visit", subjectId: input.subjectId } } });
    if (reviewed) return { ok: true, status: "already_reviewed" as const };
    const provider = await db.user.findUniqueOrThrow({ where: { id: providerId }, select: { fullName: true } });
    return this.send({ subjectType: input.serviceType, subjectId: input.subjectId, patientId: record.patientId, serviceName: provider.fullName, path: input.serviceType === "appointment" ? `/appointments?review=${input.subjectId}` : `/home-visits/${input.subjectId}` });
  },
};
