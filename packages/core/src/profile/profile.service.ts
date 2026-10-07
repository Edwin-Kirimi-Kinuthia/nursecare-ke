import { db } from "@carebora/db";
import { ApiError, PROVIDER_ROLES, type PatchPatientProfileInput, type PatchProviderProfileInput, type UserRole } from "@carebora/shared";
import { availabilityService } from "../booking/availability.service";

export const profileService = {
  async getPatient(userId: string) {
    const profile = await db.patientProfile.findUnique({ where: { userId } });
    if (!profile) throw ApiError.notFound("Patient profile not found");
    return profile;
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

    // Flipping the availability switch is what opens or closes their calendar —
    // providers never touch slots directly.
    if (data.isAvailable !== undefined && data.isAvailable !== profile.isAvailable) {
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
