import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { z } from "zod";
import { ambulanceService } from "@carebora/core";

const paySchema = z.object({
  phoneNumber: z.string().trim().regex(/^(\+?254|0)[0-9]{9}$/, "Enter a valid Kenyan phone number"),
});

/** POST /api/v1/ambulance-requests/:requestId/pay — patient pays after the trip completes. */
export const POST = route(async (req, { params }: { params: Promise<{ requestId: string }> }) => {
  const claims = await requireAuth(req, ["patient"]);
  const { requestId } = await params;
  const { phoneNumber } = paySchema.parse(await req.json());
  const payment = await ambulanceService.initiatePayment(requestId, claims.sub, phoneNumber);
  return jsonOk(payment, 202);
});
