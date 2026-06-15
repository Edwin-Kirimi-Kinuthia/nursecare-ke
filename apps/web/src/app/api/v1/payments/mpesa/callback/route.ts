import { NextResponse } from "next/server";
import { mpesaCallbackSchema } from "@carebora/shared";
import { paymentService, orderService, homeVisitService } from "@carebora/core";

/**
 * POST /api/v1/payments/mpesa/callback
 * Unified Daraja webhook — handles appointment payments (M4), pharmacy orders (M5),
 * and home visit payments (M6). Matches by checkoutRequestId; tries each in sequence.
 * Daraja expects a 200 with { ResultCode: 0, ResultDesc: "Success" }.
 */
export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const payload = mpesaCallbackSchema.parse(raw);
    const handledPayment = await paymentService.handleDarajaCallback(payload);
    if (!handledPayment) {
      const handledOrder = await orderService.handleCallback(payload);
      if (!handledOrder) await homeVisitService.handleCallback(payload);
    }
  } catch {
    // Always return 200 so Daraja doesn't retry on our errors
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
}
