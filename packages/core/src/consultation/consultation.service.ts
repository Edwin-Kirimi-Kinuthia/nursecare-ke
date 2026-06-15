import { AccessToken } from "livekit-server-sdk";
import { db } from "@carebora/db";
import {
  ApiError,
  PROVIDER_ROLES,
  type PatchConsultationInput,
  type SendMessageInput,
  type UserRole,
} from "@carebora/shared";

// Re-export so routes don't need to import db directly
type ConsultationWithAppointment = Awaited<ReturnType<typeof getConsultation>>;

async function getConsultation(id: string) {
  const c = await db.consultation.findUnique({
    where: { id },
    include: {
      appointment: { select: { patientId: true, providerId: true, appointmentType: true, status: true } },
    },
  });
  if (!c) throw ApiError.notFound("Consultation not found");
  return c;
}

function assertParticipant(c: ConsultationWithAppointment, userId: string) {
  if (c.appointment.patientId !== userId && c.appointment.providerId !== userId) {
    throw ApiError.forbidden();
  }
}

export const consultationService = {
  /**
   * Start (or retrieve) the consultation for an appointment.
   * Only the provider can initiate. Idempotent — safe to call twice.
   */
  async start(appointmentId: string, providerId: string) {
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: { consultation: true },
    });
    if (!appointment) throw ApiError.notFound("Appointment not found");
    if (appointment.providerId !== providerId) throw ApiError.forbidden();
    if (appointment.status !== "confirmed") {
      throw ApiError.badRequest("Appointment must be confirmed before starting a consultation");
    }
    if (appointment.consultation) return appointment.consultation;

    return db.consultation.create({
      data: {
        appointmentId,
        roomName: `consult-${appointmentId}`,
      },
    });
  },

  /** Fetch a consultation, verified that the caller is a participant. */
  async get(consultationId: string, userId: string) {
    const c = await getConsultation(consultationId);
    assertParticipant(c, userId);
    return c;
  },

  /** Update status or clinical notes (notes: provider only). */
  async patch(consultationId: string, userId: string, role: UserRole, input: PatchConsultationInput) {
    const c = await getConsultation(consultationId);
    assertParticipant(c, userId);

    const isProvider = PROVIDER_ROLES.includes(role);
    if (input.clinicalNotes !== undefined && !isProvider) {
      throw ApiError.forbidden("Only providers can update clinical notes");
    }

    const data: {
      clinicalNotes?: string;
      status?: "active" | "ended";
      startedAt?: Date;
      endedAt?: Date;
    } = {};

    if (input.clinicalNotes !== undefined) data.clinicalNotes = input.clinicalNotes;
    if (input.status) {
      data.status = input.status;
      if (input.status === "active" && !c.startedAt) data.startedAt = new Date();
      if (input.status === "ended" && !c.endedAt) data.endedAt = new Date();
    }

    return db.consultation.update({ where: { id: consultationId }, data });
  },

  /** Generate a LiveKit join token for the caller. */
  async generateToken(consultationId: string, userId: string, displayName: string) {
    const c = await getConsultation(consultationId);
    assertParticipant(c, userId);

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      throw ApiError.badRequest("LiveKit is not configured on this server");
    }

    const at = new AccessToken(apiKey, apiSecret, { identity: userId, name: displayName });
    at.addGrant({ roomJoin: true, room: c.roomName, canPublish: true, canSubscribe: true });

    return {
      token: await at.toJwt(),
      roomName: c.roomName,
      livekitUrl: process.env.LIVEKIT_URL ?? "",
    };
  },

  // ── Messages ────────────────────────────────────────────────────────────────

  async listMessages(consultationId: string, userId: string) {
    const c = await getConsultation(consultationId);
    assertParticipant(c, userId);
    return db.message.findMany({
      where: { consultationId },
      include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
      orderBy: { createdAt: "asc" },
    });
  },

  async sendMessage(consultationId: string, senderId: string, input: SendMessageInput) {
    const c = await getConsultation(consultationId);
    assertParticipant(c, senderId);
    if (c.status === "ended") throw ApiError.badRequest("Cannot send messages in an ended consultation");
    return db.message.create({
      data: { consultationId, senderId, content: input.content },
      include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
    });
  },
};
