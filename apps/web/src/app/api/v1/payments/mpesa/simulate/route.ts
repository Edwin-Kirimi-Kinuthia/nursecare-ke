import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { ApiError, type MpesaCallback } from "@carebora/shared";
import { paymentService, orderService, homeVisitService } from "@carebora/core";

/**
 * POST /api/v1/payments/mpesa/simulate — dev/sandbox helper.
 * The Daraja sandbox accepts an STK push but never posts a real success callback,
 * so this fires the same success callback our webhook handles, completing the
 * matching appointment payment, pharmacy order, or home-visit payment. Disabled
 * when MPESA_ENV=production.
 */
export const POST = route(async (req) => {
  await requireAuth(req);
  if (process.env.MPESA_ENV === "production") {
    throw ApiError.forbidden("Payment simulation is disabled in production.");
  }

  const { checkoutRequestId } = (await req.json()) as { checkoutRequestId?: string };
  if (!checkoutRequestId) throw ApiError.badRequest("checkoutRequestId is required");

  const payload: MpesaCallback = {
    Body: {
      stkCallback: {
        MerchantRequestID: `sim-${Date.now()}`,
        CheckoutRequestID: checkoutRequestId,
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            { Name: "MpesaReceiptNumber", Value: `SIM${Math.random().toString(36).slice(2, 9).toUpperCase()}` },
            { Name: "PhoneNumber", Value: 254708374149 },
          ],
        },
      },
    },
  };

  let type: "appointment" | "order" | "home_visit" | null = null;
  if (await paymentService.handleDarajaCallback(payload)) type = "appointment";
  else if (await orderService.handleCallback(payload)) type = "order";
  else if (await homeVisitService.handleCallback(payload)) type = "home_visit";

  if (!type) throw ApiError.notFound("No pending payment matched that reference.");
  return jsonOk({ completed: true, type });
});
