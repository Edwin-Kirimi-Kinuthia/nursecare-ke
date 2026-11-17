import { db, Prisma } from "@carebora/db";
import { ApiError, PROVIDER_ROLES, type IssueSickOffInput, type UserRole } from "@carebora/shared";
import { inAppNotifications } from "../notifications/inapp.service";

const SUMMARY = {
  id: true, consultationId: true, fromDate: true, throughDate: true,
  providerName: true, licenceNumber: true, licenceBody: true, issuedAt: true,
} satisfies Prisma.SickOffSelect;

async function participant(consultationId: string, userId: string) {
  const consultation = await db.consultation.findUnique({
    where: { id: consultationId },
    include: { appointment: { include: { patient: true, provider: { include: { user: true } } } } },
  });
  if (!consultation) throw ApiError.notFound("Consultation not found");
  const { appointment } = consultation;
  if (appointment.providerId !== userId && appointment.patientId !== userId) throw ApiError.forbidden();
  return consultation;
}

export const sickOffService = {
  async list(consultationId: string, userId: string) {
    await participant(consultationId, userId);
    return db.sickOff.findMany({ where: { consultationId }, select: SUMMARY, orderBy: { issuedAt: "desc" } });
  },

  async issue(consultationId: string, userId: string, role: UserRole, input: IssueSickOffInput) {
    const c = await participant(consultationId, userId);
    const a = c.appointment;
    if (!PROVIDER_ROLES.includes(role) || a.providerId !== userId) {
      throw ApiError.forbidden("Only the treating provider can issue a sick-off certificate");
    }
    if (a.appointmentType !== "teleconsult" || !c.startedAt || c.status === "pending" || !["confirmed", "completed"].includes(a.status)) {
      throw ApiError.badRequest("A teleconsultation session must have taken place before issuing a sick-off");
    }
    const p = a.provider;
    if (p.verificationStatus !== "verified" || !p.user.isActive || p.user.deletedAt) {
      throw ApiError.forbidden("Only a verified provider can sign a sick-off");
    }
    if (!p.licenceNumber?.trim() || !p.licenceBody?.trim()) {
      throw ApiError.badRequest("Add your licensing body and licence number to your professional profile before signing");
    }
    if (!a.paymentWaived && a.feeKes > 0 && !await db.payment.findFirst({
      where: { subjectType: "appointment", subjectId: a.id, status: "completed" }, select: { id: true },
    })) throw ApiError.badRequest("The consultation must be paid for before issuing a sick-off");

    const certificate = await db.$transaction(async (tx) => {
      const issued = await tx.sickOff.create({
        data: {
          consultationId, patientName: a.patient.fullName, providerName: p.user.fullName,
          licenceNumber: p.licenceNumber!.trim(), licenceBody: p.licenceBody!.trim(), assessedAt: c.startedAt!,
          fromDate: new Date(input.fromDate), throughDate: new Date(input.throughDate),
          advice: input.advice || null, signatureDataUrl: input.signatureDataUrl, stampDataUrl: input.stampDataUrl ?? null,
        }, select: SUMMARY,
      });
      await tx.auditLog.create({ data: { actorId: userId, action: "sick_off.issued", entityType: "sick_off", entityId: issued.id } });
      return issued;
    });
    void inAppNotifications.create(a.patientId, {
      type: "sick_off_issued", title: "Your sick-off certificate is ready",
      body: `${p.user.fullName} signed your sick-off certificate. Download it from your appointments or records.`,
      link: "/appointments",
    });
    return certificate;
  },

  async get(consultationId: string, certificateId: string, userId: string) {
    await participant(consultationId, userId);
    const certificate = await db.sickOff.findFirst({ where: { id: certificateId, consultationId } });
    if (!certificate) throw ApiError.notFound("Sick-off certificate not found");
    return certificate;
  },
};
