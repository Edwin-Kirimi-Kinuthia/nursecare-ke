/**
 * @carebora/core — transport-agnostic business logic (the "service layer").
 *
 * API route handlers in apps/web call these services; they never embed business
 * rules inline. This keeps the domain portable — a standalone server or a
 * different transport could reuse it untouched.
 *
 * Services are added per milestone:
 *   - auth.service / profile.service     (M1)
 *   - provider.service / booking.service (M2)
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
