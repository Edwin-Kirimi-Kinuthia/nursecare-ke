import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { ApiError, submitTillSchema } from "@carebora/shared";
import { paymentService, orderService, homeVisitService } from "@carebora/core";

/**
 * POST /api/v1/payments/till/submit
 * Interim Till mode: the patient reports the M-Pesa confirmation code for a Till
 * payment. Matches the pending record (appointment payment, pharmacy order, or home
 * visit) by its synthetic reference and moves it to `awaiting_verification` for an
 * admin to confirm against the Till statement.
 */
export const POST = route(async (req) => {
  await requireAuth(req);
  const { checkoutRequestId, code } = submitTillSchema.parse(await req.json());

  let context: "appointment" | "order" | "home_visit" | null = null;
  if (await paymentService.submitTill(checkoutRequestId, code)) context = "appointment";
  else if (await orderService.submitTill(checkoutRequestId, code)) context = "order";
  else if (await homeVisitService.submitTill(checkoutRequestId, code)) context = "home_visit";

  if (!context) throw ApiError.notFound("No pending payment matched that reference.");
  return jsonOk({ submitted: true, context });
});
