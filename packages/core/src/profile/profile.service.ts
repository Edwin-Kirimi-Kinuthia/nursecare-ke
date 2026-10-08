import { db } from "@carebora/db";
import { ApiError, PROVIDER_ROLES, type PatchPatientProfileInput, type PatchProviderProfileInput, type UserRole } from "@carebora/shared";
import { availabilityService } from "../booking/availability.service";

export const profileService = {
  async getPatient(userId: string) {
    const profile = await db.patientProfile.findUnique({ where: { userId } });
    if (!profile) throw ApiError.notFound("Patient profile not found");
    return profile;
  },

  /**
   * Make sure a user can be treated as a patient, creating the profile on
   * first use.
   *
   * Role and patient-hood are deliberately separate concerns. `role` governs
   * what extra powers an account has (appearing in the directory, taking
   * bookings, writing prescriptions, reaching the admin panel); being able to
   * *receive* care is universal, because a doctor or an admin may well want to
   * book a consultation or order medication for themselves.
   *
   * Only patients got a patientProfile at registration, so provider and admin
   * accounts need one minted lazily the first time they act as a patient.
   */
  async ensurePatientProfile(userId: string) {
    return db.patientProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  },

  async patchPatient(userId: string, data: PatchPatientProfileInput) {
    const profile = await db.patientProfile.findUnique({ where: { userId } });
    if (!profile) throw ApiError.notFound("Patient profile not found");
    return db.patientProfile.update({ where: { userId }, data });
  },

  async getProvider(userId: string) {
    const profile = await db.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw ApiError.notFound("Provider profile not found");
    return profile;
  },

  async patchProvider(userId: string, data: PatchProviderProfileInput) {
    const profile = await db.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw ApiError.notFound("Provider profile not found");
    // Specialties drive the public filter chips, so store them tidy.
    const tidy = (v?: string) => (v === undefined ? undefined : v.trim().replace(/\s+/g, " "));
    const updated = await db.providerProfile.update({
      where: { userId },
      data: {
        ...data,
        ...(data.specialty !== undefined ? { specialty: tidy(data.specialty) } : {}),
        ...(data.subSpecialty !== undefined ? { subSpecialty: tidy(data.subSpecialty) } : {}),
      },
    });

    // The switch itself (isAvailable) was just saved above and needs nothing
    // more. What a save does do is make sure a provider who is now bookable —
    // verified, with a fee set — actually has a calendar. Setting the fee for
    // the first time is the usual trigger. Idempotent, so every save is safe.
    await availabilityService.ensureSchedule(userId);
    return updated;
  },

  /** Guard: confirm a user has a provider role before accessing provider endpoints. */
  assertProviderRole(role: UserRole) {
    if (!PROVIDER_ROLES.includes(role)) {
      throw ApiError.forbidden("Only provider accounts can access this resource");
    }
  },
};
