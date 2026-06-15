import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { mpesaStkSchema } from "@carebora/shared";
import { paymentService } from "@carebora/core";

/**
 * POST /api/v1/payments/mpesa/stk
 * Initiate an M-Pesa STK push for a confirmed appointment.
 * Body: { appointmentId, phoneNumber }
 */
export const POST = route(async (req) => {
  const auth = await requireAuth(req, ["patient"]);
  const input = mpesaStkSchema.parse(await req.json());
  const payment = await paymentService.initiateMpesa(auth.sub, input);
  return jsonOk(payment, 202);
});
