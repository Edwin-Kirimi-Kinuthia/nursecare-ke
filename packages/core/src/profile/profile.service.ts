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
    const updated = await db.providerProfile.update({ where: { userId }, data });

    // The availability switch is what opens or closes their calendar — providers
    // never touch slots directly. Reconciled on every save rather than only on a
    // change of value: both directions are idempotent, and an account already
    // marked available but holding no slots (as every provider was before this
    // existed) heals itself on the next save instead of staying unbookable.
    if (data.isAvailable !== undefined) {
      await availabilityService.setAvailability(userId, data.isAvailable);
    }
    return updated;
  },

  /** Guard: confirm a user has a provider role before accessing provider endpoints. */
  assertProviderRole(role: UserRole) {
    if (!PROVIDER_ROLES.includes(role)) {
      throw ApiError.forbidden("Only provider accounts can access this resource");
    }
  },
};
