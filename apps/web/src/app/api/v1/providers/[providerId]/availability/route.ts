import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { ApiError, createAvailabilitySchema } from "@carebora/shared";
import { availabilityService } from "@carebora/core";

/** GET /api/v1/providers/:providerId/availability — list the provider's schedule rules. */
export const GET = route(async (_req, { params }: { params: Promise<{ providerId: string }> }) => {
  const { providerId } = await params;
  const rules = await availabilityService.listAvailabilities(providerId);
  return jsonOk(rules);
});

/**
 * POST /api/v1/providers/:providerId/availability — add a recurring schedule rule.
 * Only the provider themselves can add rules to their own schedule.
 */
export const POST = route(async (req, { params }: { params: Promise<{ providerId: string }> }) => {
  const { providerId } = await params;
  const auth = await requireAuth(req);
  if (auth.sub !== providerId) throw ApiError.forbidden("You can only manage your own availability");
  const input = createAvailabilitySchema.parse(await req.json());
  const rule = await availabilityService.createAvailability(providerId, input);
  return jsonOk(rule, 201);
});
