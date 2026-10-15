import { db } from "@carebora/db";
import { ApiError, type DeleteAccountInput } from "@carebora/shared";
import { verifyPassword } from "./password";
import { notificationService } from "../notifications/notification.service";
import { inAppNotifications } from "../notifications/inapp.service";

/**
 * Self-service account deletion, as both app stores require (Apple 5.1.1(v),
 * Google Play's account-deletion policy) and as the privacy policy promises:
 * "we remove what we can immediately and retain only what we're legally
 * required to".
 *
 * The user row cannot simply be deleted. Appointments, payments, prescriptions,
 * orders and lab orders all reference it with a restricting foreign key, and
 * medical records and financial records must be kept for their legal retention
 * period. So the row is **anonymised in place**: the person can no longer be
 * identified or signed in as, but the records that must outlive them stay
 * consistent. Everything personal that does not have to be kept is deleted.
 *
 * Removed outright: credentials, sessions, one-time codes, social logins,
 * notifications, push-notification devices, the patient profile (address, blood group, emergency contact),
 * the health information the person recorded themselves (allergies, conditions,
 * medications, vitals, immunisations, documents they uploaded), access grants,
 * business memberships, licence documents, name, email, phone and photo.
 *
 * Kept, de-identified: clinical notes and prescriptions written by clinicians,
 * lab results, appointments, payments and orders.
 */
export async function deleteAccount(userId: string, input: DeleteAccountInput) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { credentials: true, providerProfile: { select: { userId: true } } },
  });
  if (!user || user.deletedAt) throw ApiError.notFound("Account not found");

  if (user.role === "admin") {
    throw ApiError.forbidden("Administrator accounts can't be deleted here. Ask another administrator.");
  }

  // Proof it is really the account holder. Without a password (social-only
  // accounts) the typed confirmation is all there is to ask for.
  if (user.credentials) {
    if (!input.password || !verifyPassword(input.password, user.credentials.passwordHash)) {
      throw ApiError.unauthorized("That password isn't right.");
    }
  }

  // A business owner leaving would orphan the pharmacy / lab / ambulance
  // operator and its open orders; that needs a human to hand it over.
  const ownedOrg = await db.orgMember.findFirst({
    where: { userId, role: "owner", organization: { status: { in: ["approved", "pending", "in_review"] } } },
    select: { id: true },
  });
  if (ownedOrg) {
    throw ApiError.conflict(
      "You own a business account on Care Bora. Please contact support to transfer or close it before deleting yours.",
    );
  }

  const now = new Date();
  const oldEmail = user.email;
  const oldName = user.fullName;

  // Upcoming appointments on either side: cancel them and put the times back,
  // and tell the person on the other end, so nobody turns up to nothing.
  const upcoming = await db.appointment.findMany({
    where: {
      OR: [{ patientId: userId }, { providerId: userId }],
      status: { in: ["requested", "confirmed"] },
      slot: { startsAt: { gt: now } },
    },
    select: { id: true, slotId: true, patientId: true, providerId: true },
  });

  await db.$transaction(async (tx) => {
    if (upcoming.length) {
      await tx.appointment.updateMany({ where: { id: { in: upcoming.map((a) => a.id) } }, data: { status: "cancelled" } });
      await tx.slot.updateMany({ where: { id: { in: upcoming.map((a) => a.slotId) } }, data: { isBooked: false } });
    }

    // A deleted provider must not stay bookable or listed.
    if (user.providerProfile) {
      // Closed, not deleted: a cancelled appointment still points at its slot,
      // so the row has to stay. Marking every future slot booked is what takes
      // them off the calendar. (This runs after the cancellations above, which
      // free their slots, so it also catches those.)
      await tx.slot.updateMany({ where: { providerId: userId, startsAt: { gt: now } }, data: { isBooked: true } });
      await tx.availability.updateMany({ where: { providerId: userId }, data: { isActive: false } });
      await tx.providerProfile.update({
        where: { userId },
        data: {
          isAvailable: false,
          verificationStatus: "unverified",
          bio: null,
          licenceNumber: null,
          licenceBody: null,
          qualifications: [],
          services: [],
          languages: [],
          town: null,
        },
      });
    }

    // Personal data with no retention duty.
    await tx.credentials.deleteMany({ where: { userId } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.verificationCode.deleteMany({ where: { userId } });
    await tx.oAuthAccount.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.pushDevice.deleteMany({ where: { userId } });
    await tx.orgMember.deleteMany({ where: { userId } });
    await tx.verificationDocument.deleteMany({ where: { userId } });
    await tx.recordAccessGrant.deleteMany({ where: { OR: [{ patientId: userId }, { granteeUserId: userId }] } });

    // The patient's own health notes. Documents a clinician or lab uploaded to
    // their record belong to the clinical record and are kept.
    await tx.allergy.deleteMany({ where: { patientId: userId } });
    await tx.condition.deleteMany({ where: { patientId: userId } });
    await tx.medicationEntry.deleteMany({ where: { patientId: userId } });
    await tx.vitalSign.deleteMany({ where: { patientId: userId } });
    await tx.immunization.deleteMany({ where: { patientId: userId } });
    await tx.medicalDocument.deleteMany({ where: { patientId: userId, uploadedById: userId } });
    await tx.patientProfile.deleteMany({ where: { userId } });

    // Support threads keep their text but lose who wrote them.
    await tx.supportTicket.updateMany({
      where: { userId },
      data: { contactName: "Deleted user", contactEmail: `deleted-${userId}@deleted.invalid`, contactPhone: null },
    });

    // Finally the identity itself. The email must stay unique and unusable, and
    // the phone is freed so the number can be registered again.
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@deleted.invalid`,
        fullName: "Deleted user",
        phone: null,
        avatarUrl: null,
        emailVerifiedAt: null,
        phoneVerifiedAt: null,
        isActive: false,
        deletedAt: now,
      },
    });
  });

  // Tell the people on the other end of anything we just cancelled.
  for (const a of upcoming) {
    const other = a.patientId === userId ? a.providerId : a.patientId;
    void inAppNotifications.create(other, {
      type: "appointment_cancelled",
      title: "An appointment was cancelled",
      body: "The other person has closed their Care Bora account, so this appointment can't go ahead.",
      link: "/appointments",
    });
  }

  // The old address learns what happened. If someone else did this with a
  // stolen session, this email is how the real owner finds out.
  void notificationService.accountDeleted({ email: oldEmail, fullName: oldName });

  return { deleted: true as const, appointmentsCancelled: upcoming.length };
}
