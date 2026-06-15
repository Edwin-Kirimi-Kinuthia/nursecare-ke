import { NextResponse } from "next/server";
import { mpesaCallbackSchema } from "@carebora/shared";
import { paymentService, orderService } from "@carebora/core";

/**
 * POST /api/v1/payments/mpesa/callback
 * Unified Daraja webhook — handles both appointment payments (M4) and pharmacy
 * orders (M5). Matches by checkoutRequestId: tries Payment first, then Order.
 * Daraja expects a 200 with { ResultCode: 0, ResultDesc: "Success" }.
 */
export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const payload = mpesaCallbackSchema.parse(raw);
    const handled = await paymentService.handleDarajaCallback(payload);
    if (!handled) await orderService.handleCallback(payload);
  } catch {
    // Always return 200 so Daraja doesn't retry on our errors
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
}
