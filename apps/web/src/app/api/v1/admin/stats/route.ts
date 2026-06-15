import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { adminService } from "@carebora/core";

/**
 * GET /api/v1/admin/stats
 * Platform-wide aggregates: user counts by role, appointments by status,
 * total revenue + platform fee, orders by status, home visits by status.
 */
export const GET = route(async (req) => {
  await requireAuth(req, ["admin"]);
  const stats = await adminService.getStats();
  return jsonOk(stats);
});
