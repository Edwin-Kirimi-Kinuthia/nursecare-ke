import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { verificationsQuerySchema } from "@carebora/shared";
import { adminService } from "@carebora/core";

/**
 * GET /api/v1/admin/verifications
 * List provider profiles filterable by verificationStatus and specialty.
 * Includes uploaded KYC documents for review.
 */
export const GET = route(async (req) => {
  await requireAuth(req, ["admin"]);
  const { searchParams } = new URL(req.url);
  const query = verificationsQuerySchema.parse(Object.fromEntries(searchParams));
  const result = await adminService.listVerifications(query);
  return jsonOk(result);
});
