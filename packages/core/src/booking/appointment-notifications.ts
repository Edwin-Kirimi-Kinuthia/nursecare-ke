import { db } from "@carebora/db";
import { runInBackground } from "../lib/background";
import { notificationService } from "../notifications/notification.service";
import { inAppNotifications } from "../notifications/inapp.service";
import { whatsAppEvents } from "../notifications/whatsapp.service";

/** Called only after a booking is placed (after verified teleconsult payment). */
export function notifyAppointmentBooked(id: string) {
  const work = deliverBookingNotifications(id).catch(() => {
    console.error("[notifications] Could not deliver booking notifications");
  });
  runInBackground(work);
  return work;
}

async function deliverBookingNotifications(id: string) {
  const a = await db.appointment.findUniqueOrThrow({ where: { id }, include: {
    slot: true, patient: true, provider: { include: { user: true } },
  } });
  if (a.status !== "requested" && a.status !== "confirmed") return;
  void inAppNotifications.serviceRequested("an appointment", a.id);
  void whatsAppEvents.booked(a.id);
  const details = {
    patientEmail: a.patient.email, patientPhone: a.patient.phone, patientName: a.patient.fullName,
    providerName: a.provider.user.fullName, slotTime: a.slot.startsAt, feeKes: a.feeKes,
  };
  if (a.status === "confirmed") {
    void whatsAppEvents.confirmed({ ...a, paid: true });
    void notificationService.appointmentConfirmed({ ...details, paid: true });
    void inAppNotifications.create(a.providerId, {
      type: "appointment_booked", title: "New paid booking",
      body: `${a.patient.fullName} paid for a teleconsultation. Open your portal to view the appointment.`, link: "/appointments",
    });
    void inAppNotifications.create(a.patientId, {
      type: "appointment_confirmed", title: "Booking placed and confirmed",
      body: "Your payment was verified and your consultation is confirmed.", link: "/appointments",
    });
  } else {
    void notificationService.appointmentBooked({ ...details, specialty: a.provider.specialty });
    void inAppNotifications.create(a.providerId, {
      type: "appointment_requested", title: "New appointment request",
      body: `${a.patient.fullName} ${a.appointmentType === "teleconsult" ? "paid for a teleconsultation" : "requested a home visit"}. Open your portal to confirm the appointment.`, link: "/appointments",
    });
  }
}
