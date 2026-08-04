import { NextResponse } from "next/server";
import { mpesaCallbackSchema } from "@carebora/shared";
import { settlementService } from "@carebora/core";

/**
 * POST /api/v1/payments/mpesa/callback — legacy direct-Daraja webhook, kept for
 * environments running PAYMENTS_MODE=mpesa_daraja without Jenga credentials yet.
 * Matches by gatewayRef (Daraja's CheckoutRequestID) against the polymorphic
 * Payment table — one lookup now covers appointments, orders, and home visits.
 * Daraja expects a 200 with { ResultCode: 0, ResultDesc: "Success" }.
 */
export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const payload = mpesaCallbackSchema.parse(raw);
    await settlementService.handleDarajaCallback(payload);
  } catch {
    // Always return 200 so Daraja doesn't retry on our errors
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
}
