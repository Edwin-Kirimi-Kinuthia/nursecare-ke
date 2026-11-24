export * from "./errors";
export * from "./http";
export * from "./schemas";
export * from "./clinical";
export * from "./geo";
export * from "./names";
export * from "./countries";

/** Roles a CareBora account can hold. Mirrors the DB enum in @carebora/db. */
export const UserRole = {
  PATIENT: "patient",
  DOCTOR: "doctor",
  NURSE: "nurse",
  PHYSIO: "physio",
  PHARMACY: "pharmacy",
  VENDOR: "vendor",
  ADMIN: "admin",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Roles that deliver care (as opposed to patients/admins). */
export const PROVIDER_ROLES: UserRole[] = [
  UserRole.DOCTOR,
  UserRole.NURSE,
  UserRole.PHYSIO,
  UserRole.PHARMACY,
];

export const APP_NAME = "CareBora";
export const API_VERSION = "v1";

/** Care Bora's business WhatsApp. Both the website and the mobile app link here. */
export const WHATSAPP_URL = "https://wa.me/16807783483";
export const WHATSAPP_DISPLAY = "+1 680 778 3483";
export { NAVIGATION_SERVICES, type NavigationReply } from "./navigation";
export { withdrawalRequestSchema, processWithdrawalSchema, navigationQuestionSchema } from "./schemas/earnings";
export { b2cResultSchema, reconcileWithdrawalSchema } from "./schemas/earnings";

export { medicineUnit, orderStatusLabel, ORDER_NEXT_STATUS } from "./pharmacy";
