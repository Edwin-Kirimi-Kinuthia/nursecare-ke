import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { moderateReviewSchema } from "@carebora/shared";
import { reviewService } from "@carebora/core";

/** PATCH /api/v1/admin/reviews/:reviewId — show or hide a review. */
export const PATCH = route(async (req, { params }: { params: Promise<{ reviewId: string }> }) => {
  const { reviewId } = await params;
  await requireAuth(req, ["admin"]);
  const input = moderateReviewSchema.parse(await req.json());
  const data = await reviewService.moderate(reviewId, input);
  return jsonOk(data);
});
