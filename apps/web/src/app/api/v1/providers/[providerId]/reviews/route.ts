import { route, jsonOk } from "@/server/http";
import { reviewsQuerySchema } from "@carebora/shared";
import { reviewService } from "@carebora/core";

/** GET /api/v1/providers/:providerId/reviews — public list of visible reviews. */
export const GET = route(async (req, { params }: { params: Promise<{ providerId: string }> }) => {
  const { providerId } = await params;
  const query = reviewsQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const data = await reviewService.listByProvider(providerId, { ...query, isVisible: true });
  return jsonOk(data);
});
