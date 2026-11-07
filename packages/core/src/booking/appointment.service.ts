import { db, Prisma } from "@carebora/db";
import {
  ApiError,
  PROVIDER_ROLES,
  type AppointmentsQuery,
  type CreateAppointmentInput,
  type PatchAppointmentInput,
  type UserRole,
} from "@carebora/shared";
import { notificationService } from "../notifications/notification.service";
import { inAppNotifications } from "../notifications/inapp.service";
import { paymentService } from "../payment/payment.service";

const APPOINTMENT_INCLUDE = {
  slot: true,
  provider: {
    select: {
      userId: true,
      specialty: true,
      consultationFeeKes: true,
      homeVisitFeeKes: true,
      user: { select: { fullName: true, avatarUrl: true } },
    },
  },
  patient: { select: { id: true, fullName: true, avatarUrl: true, email: true, phone: true } },
  consultation: { select: { id: true, status: true } },
  // So the card can offer "Rate your visit" or show the rating already left,
  // without a second request per appointment.
  review: { select: { id: true, rating: true, comment: true } },
} satisfies Prisma.AppointmentInclude;

// Payment is polymorphic (no direct Prisma relation) — attached manually.
async function attachPayment<T extends { id: string }>(appointment: T) {
  const payment = await paymentService.getForSubject("appointment", appointment.id);
  return { ...appointment, payment };
}

async function attachPayments<T extends { id: string }>(appointments: T[]) {
  const payments = await paymentService.getForSubjects("appointment", appointments.map((a) => a.id));
  return appointments.map((a) => ({ ...a, payment: payments.get(a.id) ?? null }));
}

export const appointmentService = {
  /** Patient books a slot. Fails if the slot is already taken. */
  async create(patientId: string, input: CreateAppointmentInput) {
    const slot = await db.slot.findUnique({ where: { id: input.slotId } });
    if (!slot) throw ApiError.notFound("Slot not found");
    if (slot.isBooked) throw ApiError.conflict("This slot is already booked");
    if (slot.startsAt <= new Date()) throw ApiError.badRequest("Cannot book a slot in the past");

    const provider = await db.providerProfile.findUnique({
      where: { userId: slot.providerId, user: { isActive: true, deletedAt: null } },
    });
    if (!provider) throw ApiError.notFound("Provider not found");
    // Only listed (verified) providers can be booked. Also what stops a slot
    // that was left over from an account that has since been deleted.
    if (provider.verificationStatus !== "verified") {
      throw ApiError.badRequest("This provider isn't available for booking");
    }

    // Any signed-in account can book care, providers included — but not from
    // itself. Doing so would take a real slot out of circulation and create an
    // appointment the same person sits on both sides of, with the clinical
    // notes and prescription that implies.
    if (slot.providerId === patientId) {
      throw ApiError.badRequest("You cannot book an appointment with yourself");
    }

    const feeKes =
      slot.appointmentType === "teleconsult"
        ? (provider.consultationFeeKes ?? 0)
        : (provider.homeVisitFeeKes ?? 0);

    // A clinician travelling to the patient needs a number to reach them on;
    // a teleconsult happens in-app, so it stays optional there.
    if (slot.appointmentType === "home_visit" && !input.contactPhone) {
      throw ApiError.badRequest("A contact phone number is required for a home visit");
    }

    // The provider's switch decides what a booking means. Available: it is
    // confirmed on the spot, so the patient can pay straight away and be seen
    // at their slot. Busy (with another client, say): the booking still goes
    // through, but as a request the provider confirms first — and the patient
    // pays only once it is, so nobody is charged for a time that gets declined.
    const autoConfirm = provider.isAvailable && slot.appointmentType === "teleconsult";

    try {
      const [appointment] = await db.$transaction([
        db.appointment.create({
          data: {
            patientId,
            providerId: slot.providerId,
            slotId: slot.id,
            appointmentType: slot.appointmentType,
            status: autoConfirm ? "confirmed" : "requested",
            feeKes,
            patientNotes: input.patientNotes ?? null,
            contactPhone: input.contactPhone ?? null,
          },
          include: APPOINTMENT_INCLUDE,
        }),
        db.slot.update({ where: { id: slot.id }, data: { isBooked: true } }),
      ]);
      const providerName = appointment.provider.user.fullName;
      if (autoConfirm) {
        // Already confirmed: tell the patient to pay, not to wait.
        void notificationService.appointmentConfirmed({
          patientEmail: appointment.patient.email,
          patientPhone: appointment.patient.phone,
          patientName: appointment.patient.fullName,
          providerName,
          slotTime: slot.startsAt,
          feeKes: appointment.feeKes,
        });
        void inAppNotifications.create(appointment.providerId, {
          type: "appointment_booked",
          title: "New booking",
          body: `${appointment.patient.fullName} booked a teleconsultation. You can start it once they've paid.`,
          link: "/appointments",
        });
      } else {
        void notificationService.appointmentBooked({
          patientEmail: appointment.patient.email,
          patientPhone: appointment.patient.phone,
          patientName: appointment.patient.fullName,
          providerName,
          specialty: appointment.provider.specialty,
          slotTime: slot.startsAt,
          feeKes: appointment.feeKes,
        });
        // Notify the provider in-app that a new request needs their action.
        void inAppNotifications.create(appointment.providerId, {
          type: "appointment_requested",
          title: "New appointment request",
          body: `${appointment.patient.fullName} requested a ${appointment.appointmentType === "teleconsult" ? "teleconsultation" : "home visit"}. Confirm it to let them pay.`,
          link: "/appointments",
        });
      }
      return attachPayment(appointment);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw ApiError.conflict("This slot was just booked by someone else");
      }
      throw err;
    }
  },

  /** List appointments for the calling user (patient sees theirs, provider sees theirs). */
  async list(userId: string, _role: UserRole, query: AppointmentsQuery) {
    // Either side of the appointment, rather than one side chosen by role.
    // A provider has a clinical workload *and* may book care for themselves;
    // filtering on providerId alone hid their own bookings from them entirely.
    // For a patient-only account the providerId arm simply never matches.
    const where = {
      OR: [{ patientId: userId }, { providerId: userId }],
      ...(query.status ? { status: query.status } : {}),
    };
    const [appointments, total] = await Promise.all([
      db.appointment.findMany({
        where,
        include: APPOINTMENT_INCLUDE,
        orderBy: { slot: { startsAt: "asc" } },
        skip: query.offset,
        take: query.limit,
      }),
      db.appointment.count({ where }),
    ]);
    return { appointments: await attachPayments(appointments), total, limit: query.limit, offset: query.offset };
  },

  /** Get a single appointment — accessible by the patient or the provider. */
  async getById(appointmentId: string, userId: string, role: UserRole) {
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: APPOINTMENT_INCLUDE,
    });
    if (!appointment) throw ApiError.notFound("Appointment not found");

    // Either side may read it. Keyed off the appointment, not the account's
    // role, so a provider can open a consultation they booked for themselves.
    const owns = appointment.providerId === userId || appointment.patientId === userId;
    if (!owns) throw ApiError.forbidden();

    return attachPayment(appointment);
  },

  /** Update appointment status or notes. RBAC: providers confirm/complete/no_show; patients cancel. */
  async patch(
    appointmentId: string,
    userId: string,
    role: UserRole,
    input: PatchAppointmentInput,
  ) {
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) throw ApiError.notFound("Appointment not found");

    // Which side of *this* appointment the caller is on. A care account can be
    // the patient on an appointment it booked for itself, and there it gets the
    // patient's powers (cancel), not the clinician's (confirm/complete).
    // Self-booking is blocked in create(), so these two are mutually exclusive.
    const isAdmin = role === "admin";
    const isActingProvider = PROVIDER_ROLES.includes(role) && appointment.providerId === userId;
    const isActingPatient = appointment.patientId === userId;

    if (!isAdmin && !isActingProvider && !isActingPatient) throw ApiError.forbidden();

    if (input.status && !isAdmin) {
      const providerStatuses = ["confirmed", "completed", "no_show"] as const;
      const patientStatuses = ["cancelled"] as const;

      if (isActingProvider && !(providerStatuses as readonly string[]).includes(input.status)) {
        throw ApiError.forbidden("Providers can only confirm, complete, or mark no-show");
      }
      if (isActingPatient && !(patientStatuses as readonly string[]).includes(input.status)) {
        throw ApiError.forbidden("Patients can only cancel appointments");
      }
    }

    // Free the slot if the appointment is cancelled
    if (input.status === "cancelled" && appointment.status !== "cancelled") {
      await db.slot.update({ where: { id: appointment.slotId }, data: { isBooked: false } });
    }

    const updated = await db.appointment.update({
      where: { id: appointmentId },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: APPOINTMENT_INCLUDE,
    });

    if (input.status === "confirmed") {
      void notificationService.appointmentConfirmed({
        patientEmail: updated.patient.email,
        patientPhone: updated.patient.phone,
        patientName: updated.patient.fullName,
        providerName: updated.provider.user.fullName,
        slotTime: updated.slot.startsAt,
        feeKes: updated.feeKes,
      });
      void inAppNotifications.create(updated.patientId, {
        type: "appointment_confirmed",
        title: "Appointment confirmed",
        body: `${updated.provider.user.fullName} confirmed your appointment.${updated.appointmentType === "teleconsult" ? " You'll be notified when it's time to join." : ""}`,
        link: "/appointments",
      });
    }

    return attachPayment(updated);
  },
};
