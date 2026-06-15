import { db } from "@carebora/db";
import { ApiError, PROVIDER_ROLES, type PatchPatientProfileInput, type PatchProviderProfileInput, type UserRole } from "@carebora/shared";

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
    return db.providerProfile.update({ where: { userId }, data });
  },

  /** Guard: confirm a user has a provider role before accessing provider endpoints. */
  assertProviderRole(role: UserRole) {
    if (!PROVIDER_ROLES.includes(role)) {
      throw ApiError.forbidden("Only provider accounts can access this resource");
    }
  },
};
