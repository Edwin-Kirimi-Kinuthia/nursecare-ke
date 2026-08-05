import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { reviewOrgSchema } from "@carebora/shared";
import { orgService } from "@carebora/core";

/**
 * POST /api/v1/admin/organizations/:orgId/review
 * Approve, reject, suspend, or put a vendor business back in_review; optionally
 * override its commission rate. Writes an audit log entry.
 */
export const POST = route(async (req, { params }: { params: Promise<{ orgId: string }> }) => {
  const claims = await requireAuth(req, ["admin"]);
  const { orgId } = await params;
  const input = reviewOrgSchema.parse(await req.json());
  const org = await orgService.adminReview(orgId, claims.sub, input);
  return jsonOk(org);
});
