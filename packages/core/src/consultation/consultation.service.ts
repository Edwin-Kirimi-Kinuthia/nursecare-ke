import { AccessToken, RoomServiceClient, WebhookReceiver } from "livekit-server-sdk";
import { db } from "@carebora/db";
import { notificationService } from "../notifications/notification.service";
import { inAppNotifications } from "../notifications/inapp.service";
import { whatsAppEvents } from "../notifications/whatsapp.service";
import {
  ApiError,
  PROVIDER_ROLES,
  renderClinicalRecord,
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
      appointment: { select: { patientId: true, providerId: true, appointmentType: true, status: true, feeKes: true, paymentWaived: true } },
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
   * Start, retrieve, or resume the consultation for an appointment.
   * Only the provider can initiate. Idempotent — safe to call twice.
   */
  async start(appointmentId: string, providerId: string) {
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        consultation: true,
        patient: { select: { id: true, fullName: true, email: true, phone: true } },
        provider: { select: { user: { select: { fullName: true } } } },
      },
    });
    if (!appointment) throw ApiError.notFound("Appointment not found");
    if (appointment.providerId !== providerId) throw ApiError.forbidden();
    if (appointment.appointmentType !== "teleconsult") {
      throw ApiError.badRequest("Only video appointments have a consultation room");
    }
    if (appointment.status !== "confirmed" && appointment.status !== "completed") {
      throw ApiError.badRequest("Appointment must be confirmed or completed before starting a consultation");
    }
    if (appointment.status === "completed" && !appointment.consultation) {
      throw ApiError.badRequest("There is no previous consultation to resume");
    }
    const resuming = !!appointment.consultation && (appointment.status === "completed" || appointment.consultation.status === "ended");

    // Paid before seen. Confirmation alone used to be enough, so a patient
    // could be taken into a consultation without ever paying for it — and
    // nothing afterwards chases the money. Checked here, at the one place a
    // consultation begins, so it holds regardless of which screen or client
    // asks. Only provider-authorised waivers bypass payment.
    // Reopening is a provider request and never charges the client again.
    if (!resuming && !appointment.paymentWaived) {
      const paid = await db.payment.findFirst({
        where: { subjectType: "appointment", subjectId: appointmentId, patientId: appointment.patientId, amountKes: { gte: appointment.feeKes }, status: "completed" },
        select: { id: true },
      });
      if (!paid) {
        throw ApiError.badRequest("This consultation hasn't been paid for yet. You can start it once the patient has paid.");
      }
    }
    if (appointment.consultation && !resuming) return appointment.consultation;

    const consultation = await db.$transaction(async (tx) => {
      if (resuming) {
        await tx.appointment.update({
          where: { id: appointmentId },
          data: { status: "confirmed", paymentWaived: true },
        });
      }
      if (appointment.consultation) {
        // Retain the room, clinical record, prescriptions and original start.
        return tx.consultation.update({
          where: { id: appointment.consultation.id },
          data: { status: "active", endedAt: null, meetingRun: { increment: 1 } },
        });
      }
      return tx.consultation.upsert({
        where: { appointmentId },
        create: { appointmentId, roomName: `consult-${appointmentId}` },
        update: {},
      });
    });

    return consultation;
  },

  /**
   * The calling patient's medical history: every consultation tied to their
   * appointments, with the doctor's clinical notes and any prescriptions.
   */
  async listForPatient(patientId: string) {
    return db.consultation.findMany({
      where: { appointment: { patientId } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        clinicalNotes: true,
        // The structured record + the provider's role are what let the patient's
        // record render the actual treatment sheet / nursing care plan with its
        // labelled sections, rather than just the flat plain-text rendering.
        clinicalRecord: true,
        startedAt: true,
        endedAt: true,
        createdAt: true,
        appointment: {
          select: {
            id: true,
            appointmentType: true,
            slot: { select: { startsAt: true } },
            provider: {
              select: { userId: true, specialty: true, user: { select: { fullName: true, role: true } } },
            },
          },
        },
        prescriptions: {
          orderBy: { issuedAt: "desc" },
          select: { id: true, medications: true, instructions: true, issuedAt: true },
        },
      },
    });
  },

  /** Fetch a consultation, verified that the caller is a participant. */
  async get(consultationId: string, userId: string) {
    const c = await getConsultation(consultationId);
    assertParticipant(c, userId);
    return c;
  },

  /** Confirm media presence on LiveKit before sending a join alert. */
  async providerConnected(consultationId: string, providerId: string) {
    const c = await getConsultation(consultationId);
    if (c.appointment.providerId !== providerId) throw ApiError.forbidden();
    if (c.status === "ended" || c.appointment.status !== "confirmed") return { notified: false };
    if (!c.appointment.paymentWaived && !await db.payment.findFirst({
      where: { subjectType: "appointment", subjectId: c.appointmentId, patientId: c.appointment.patientId, amountKes: { gte: c.appointment.feeKes }, status: "completed" }, select: { id: true },
    })) return { notified: false };
    const { LIVEKIT_URL: url, LIVEKIT_API_KEY: key, LIVEKIT_API_SECRET: secret } = process.env;
    if (!url || !key || !secret) return { notified: false };
    try {
      const serverUrl = url.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
      const participant = await new RoomServiceClient(serverUrl, key, secret).getParticipant(c.roomName, providerId);
      // ACTIVE = 2 means ICE connectivity has been established.
      if (participant.state !== 2) return { notified: false };
    } catch { return { notified: false }; }
    const current = await getConsultation(consultationId);
    if (current.status === "ended" || current.appointment.status !== "confirmed" || current.meetingRun !== c.meetingRun) return { notified: false };
    const alert = await inAppNotifications.create(current.appointment.patientId, {
      type: "consultation_started", title: "Your provider is ready — join now",
      body: "Your provider has connected to the consultation. Open your appointment to join.",
      link: `/consultations/${current.id}`, eventKey: `ready:${current.id}:${current.meetingRun}`,
    });
    if (alert) {
      const [patient, provider] = await Promise.all([
        db.user.findUniqueOrThrow({ where: { id: current.appointment.patientId }, select: { fullName: true, email: true, phone: true } }),
        db.user.findUniqueOrThrow({ where: { id: providerId }, select: { fullName: true } }),
      ]);
      void notificationService.consultationStarted({
        patientEmail: patient.email, patientPhone: patient.phone, patientName: patient.fullName,
        providerName: provider.fullName,
        joinUrl: `${process.env.APP_URL || "https://app.carebora.co.ke"}/consultations/${current.id}`,
      });
    }
    await whatsAppEvents.ready(current);
    return { notified: true };
  },

  /** Signed LiveKit events cover both browser and native-app consultations. */
  async livekitWebhook(rawBody: string, authorization: string | null) {
    const { LIVEKIT_API_KEY: key, LIVEKIT_API_SECRET: secret } = process.env;
    if (!key || !secret || !authorization) throw ApiError.unauthorized();
    let event;
    try { event = await new WebhookReceiver(key, secret).receive(rawBody, authorization); }
    catch { throw ApiError.unauthorized("Invalid LiveKit webhook signature"); }
    if (event.event !== "participant_joined" || !event.room?.name || !event.participant?.identity) return;
    const c = await db.consultation.findUnique({ where: { roomName: event.room.name }, select: { id: true, appointment: { select: { providerId: true } } } });
    if (c?.appointment.providerId === event.participant.identity) await this.providerConnected(c.id, event.participant.identity);
  },

  /**
   * Fetch a consultation with participant names + provider role — used to render
   * the treatment-sheet PDF. Participant-scoped (patient or provider).
   */
  async getWithParticipants(consultationId: string, userId: string) {
    const c = await db.consultation.findUnique({
      where: { id: consultationId },
      include: {
        appointment: {
          select: {
            patientId: true,
            providerId: true,
            createdAt: true,
            slot: { select: { startsAt: true } },
            patient: { select: { fullName: true } },
            provider: {
              select: { specialty: true, user: { select: { fullName: true, role: true } } },
            },
          },
        },
        prescriptions: {
          orderBy: { issuedAt: "desc" },
          select: { medications: true, instructions: true, issuedAt: true },
        },
      },
    });
    if (!c) throw ApiError.notFound("Consultation not found");
    if (c.appointment.patientId !== userId && c.appointment.providerId !== userId) {
      throw ApiError.forbidden();
    }
    return c;
  },

  /** Update status or clinical notes (notes: provider only). */
  async patch(consultationId: string, userId: string, role: UserRole, input: PatchConsultationInput) {
    const c = await getConsultation(consultationId);
    assertParticipant(c, userId);

    const isProvider = PROVIDER_ROLES.includes(role) && c.appointment.providerId === userId;
    if ((input.clinicalNotes !== undefined || input.clinicalRecord !== undefined) && !isProvider) {
      throw ApiError.forbidden("Only providers can update clinical documentation");
    }
    if (input.status && !isProvider) {
      throw ApiError.forbidden("Only the appointment's provider can change the consultation status");
    }
    if (input.status === "active" && (c.status === "ended" || c.appointment.status !== "confirmed")) {
      throw ApiError.badRequest("Resume the appointment before reopening this consultation");
    }

    const data: {
      clinicalNotes?: string;
      clinicalRecord?: Record<string, string>;
      status?: "active" | "ended";
      startedAt?: Date;
      endedAt?: Date;
    } = {};

    if (input.clinicalRecord !== undefined) {
      data.clinicalRecord = input.clinicalRecord;
      // Keep clinicalNotes as a readable, labelled snapshot so medical-history
      // and any text views render the structured record without extra work.
      data.clinicalNotes = renderClinicalRecord(role, input.clinicalRecord);
    }
    if (input.clinicalNotes !== undefined) data.clinicalNotes = input.clinicalNotes;
    if (input.status) {
      data.status = input.status;
      if (input.status === "active" && !c.startedAt) data.startedAt = new Date();
      if (input.status === "ended" && !c.endedAt) data.endedAt = new Date();
    }

    const updated = await db.consultation.update({ where: { id: consultationId }, data });

    // Ending the consultation completes the appointment. This used to be a
    // second call the web page made from the browser after the first, which
    // meant any other client — the mobile app — had to know to repeat it, and
    // an interrupted connection between the two left a finished consultation
    // with a "confirmed" appointment that patients couldn't review. It belongs
    // here, where every client gets it. Idempotent, and only moves an appointment
    // that was actually in progress.
    if (input.status === "ended") {
      await db.appointment.updateMany({
        where: { id: c.appointmentId, status: "confirmed" },
        data: { status: "completed" },
      });
    }
    return updated;
  },

  /** Generate a LiveKit join token for the caller. */
  async generateToken(consultationId: string, userId: string, displayName: string) {
    const c = await getConsultation(consultationId);
    assertParticipant(c, userId);
    if (c.status === "ended" || c.appointment.status !== "confirmed") {
      throw ApiError.badRequest("The provider must start or resume this consultation before you can join");
    }
    if (!c.appointment.paymentWaived) {
      const paid = await db.payment.findFirst({
        where: { subjectType: "appointment", subjectId: c.appointmentId, patientId: c.appointment.patientId, amountKes: { gte: c.appointment.feeKes }, status: "completed" }, select: { id: true },
      });
      if (!paid) throw ApiError.badRequest("Payment is required before joining this consultation");
    }

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
