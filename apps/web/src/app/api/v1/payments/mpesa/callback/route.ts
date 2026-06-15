import { NextResponse } from "next/server";
import { mpesaCallbackSchema } from "@carebora/shared";
import { paymentService } from "@carebora/core";

/**
 * POST /api/v1/payments/mpesa/callback
 * Daraja webhook — no bearer auth (Safaricom calls this directly).
 * Daraja expects a 200 with { ResultCode: 0, ResultDesc: "Success" }.
 */
export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const payload = mpesaCallbackSchema.parse(raw);
    await paymentService.handleDarajaCallback(payload);
  } catch {
    // Always return 200 so Daraja doesn't retry on our parse errors
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
}
