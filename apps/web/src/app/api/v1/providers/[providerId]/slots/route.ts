import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { ApiError, createSlotSchema, slotsQuerySchema } from "@carebora/shared";
import { availabilityService } from "@carebora/core";

/** GET /api/v1/providers/:providerId/slots — list open (unbooked) slots. */
export const GET = route(async (req, { params }: { params: Promise<{ providerId: string }> }) => {
  const { providerId } = await params;
  const { searchParams } = new URL(req.url);
  const query = slotsQuerySchema.parse(Object.fromEntries(searchParams));
  const slots = await availabilityService.listSlots(providerId, query);
  return jsonOk(slots);
});

/** POST /api/v1/providers/:providerId/slots — manually add a one-off slot (provider only). */
export const POST = route(async (req, { params }: { params: Promise<{ providerId: string }> }) => {
  const { providerId } = await params;
  const auth = await requireAuth(req);
  if (auth.sub !== providerId) throw ApiError.forbidden("You can only add slots to your own schedule");
  const input = createSlotSchema.parse(await req.json());
  const slot = await availabilityService.createSlot(providerId, input);
  return jsonOk(slot, 201);
});
