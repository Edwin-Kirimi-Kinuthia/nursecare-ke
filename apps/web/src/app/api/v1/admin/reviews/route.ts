import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { reviewsQuerySchema } from "@carebora/shared";
import { reviewService } from "@carebora/core";

/** GET /api/v1/admin/reviews — admin view of all reviews (can filter by visibility). */
export const GET = route(async (req) => {
  await requireAuth(req, ["admin"]);
  const query = reviewsQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const data = await reviewService.adminList(query);
  return jsonOk(data);
});
