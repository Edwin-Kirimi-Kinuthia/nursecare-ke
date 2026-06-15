import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { reviewVerificationSchema } from "@carebora/shared";
import { adminService } from "@carebora/core";

/**
 * POST /api/v1/admin/verifications/:userId/review
 * Set a provider's verificationStatus to in_review, verified, or rejected.
 * Marks their most recent unreviewed document and writes an audit log entry.
 */
export const POST = route(async (req, { params }: { params: Promise<{ userId: string }> }) => {
  const claims = await requireAuth(req, ["admin"]);
  const { userId } = await params;
  const body = await req.json();
  const input = reviewVerificationSchema.parse(body);
  const provider = await adminService.reviewVerification(userId, claims.sub, input);
  return jsonOk(provider);
});
