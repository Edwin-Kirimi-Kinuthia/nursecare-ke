import { db } from "@carebora/db";
import { ApiError, PROVIDER_ROLES, type CreatePrescriptionInput, type UserRole } from "@carebora/shared";
import { notificationService } from "../notifications/notification.service";

async function getConsultationOrThrow(consultationId: string) {
  const c = await db.consultation.findUnique({
    where: { id: consultationId },
    include: {
      appointment: { select: { patientId: true, providerId: true } },
    },
  });
  if (!c) throw ApiError.notFound("Consultation not found");
  return c;
}

export const prescriptionService = {
  async list(consultationId: string, userId: string, role: UserRole) {
    const c = await getConsultationOrThrow(consultationId);
    const isProvider = PROVIDER_ROLES.includes(role);
    const isParticipant =
      c.appointment.patientId === userId || c.appointment.providerId === userId;
    if (!isParticipant) throw ApiError.forbidden();

    return db.prescription.findMany({
      where: { consultationId },
      include: {
        provider: { select: { id: true, fullName: true } },
        patient: { select: { id: true, fullName: true } },
      },
      orderBy: { issuedAt: "desc" },
    });
  },

  async create(consultationId: string, providerId: string, role: UserRole, input: CreatePrescriptionInput) {
    if (!PROVIDER_ROLES.includes(role)) throw ApiError.forbidden("Only providers can issue prescriptions");

    const c = await getConsultationOrThrow(consultationId);
    if (c.appointment.providerId !== providerId) throw ApiError.forbidden();
    if (c.status === "ended" === false && c.status !== "active") {
      // Allow issuing from active or ended consultations
      if (c.status === "pending") {
        throw ApiError.badRequest("Cannot issue a prescription before the consultation starts");
      }
    }

    const rx = await db.prescription.create({
      data: {
        consultationId,
        patientId: c.appointment.patientId,
        providerId,
        medications: input.medications,
        instructions: input.instructions ?? null,
        expiresAt: input.expiresAt ?? null,
      },
      include: {
        provider: { select: { id: true, fullName: true } },
        patient: { select: { id: true, fullName: true, email: true } },
      },
    });
    void notificationService.prescriptionIssued({
      patientEmail: rx.patient.email,
      patientName: rx.patient.fullName,
      providerName: rx.provider.fullName,
      medicationCount: (input.medications as unknown[]).length,
    });
    return rx;
  },

  async getById(prescriptionId: string, userId: string, role: UserRole) {
    const rx = await db.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        provider: { select: { id: true, fullName: true } },
        patient: { select: { id: true, fullName: true } },
        consultation: { select: { roomName: true, appointmentId: true } },
      },
    });
    if (!rx) throw ApiError.notFound("Prescription not found");
    const owns = rx.patientId === userId || rx.providerId === userId;
    if (!owns) throw ApiError.forbidden();
    return rx;
  },
};
