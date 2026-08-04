/**
 * @carebora/core — transport-agnostic business logic (the "service layer").
 *
 * API route handlers in apps/web call these services; they never embed business
 * rules inline. This keeps the domain portable — a standalone server or a
 * different transport could reuse it untouched.
 *
 * Implemented:
 *   - auth.service (register / login / refresh / logout / getProfile)  (M1)
 *   - profile.service (patient/provider GET + PATCH)                   (M1)
 *   - providerService / availabilityService / appointmentService        (M2)
 *   - consultationService / prescriptionService                        (M3)
 *   - paymentService (M-Pesa STK push, callback, ledger, refund)      (M4)
 *   - productService / orderService (pharmacy catalogue + orders)     (M5)
 * Added per later milestone:
 *   - consultation.service               (M3)
 *   - payment.service                    (M4)
 *   - pharmacy.service / order.service   (M5)
 *   - homeVisit.service                  (M6)
 */
import { db } from "@carebora/db";

export const health = {
  /** Round-trips a trivial query to confirm the database is reachable. */
  async check(): Promise<{ db: "up" | "down" }> {
    try {
      await db.$queryRaw`SELECT 1`;
      return { db: "up" };
    } catch {
      return { db: "down" };
    }
  },
};

export { authService } from "./auth/auth.service";
export type { RequestMeta } from "./auth/auth.service";
export {
  verifyAccessToken,
  signAccessToken,
  type AccessClaims,
} from "./auth/tokens";
export { profileService } from "./profile/profile.service";
export { providerService } from "./booking/provider.service";
export { availabilityService } from "./booking/availability.service";
export { appointmentService } from "./booking/appointment.service";
export { consultationService } from "./consultation/consultation.service";
export { prescriptionService } from "./consultation/prescription.service";
export { paymentService, toPaymentSummary, type PaymentSummary, type InitiateInput } from "./payment/payment.service";
export { settlementService } from "./payment/settlement.service";
export { drugService } from "./pharmacy/drug.service";
export { listingService } from "./pharmacy/listing.service";
export { storefrontService } from "./pharmacy/storefront.service";
export { orderService } from "./pharmacy/order.service";
export { homeVisitService } from "./homevisit/homevisit.service";
export { adminService } from "./admin/admin.service";
export { notificationService } from "./notifications/notification.service";
export { inAppNotifications } from "./notifications/inapp.service";
export { reviewService } from "./reviews/review.service";
export { orgService, resolveMembership } from "./org/org.service";
export { ambulanceService } from "./ambulance/ambulance.service";
export { getEnv, type Env } from "./config/env";
export { putFile, STORAGE_LIMITS, type StorageKind, type StoredFile } from "./storage/storage";
export { aiService } from "./ai/ai.service";
export type { SymptomCheckResult, ProviderMatchResult, FactCheckResult, PharmacySuggestion } from "./ai/ai.service";
