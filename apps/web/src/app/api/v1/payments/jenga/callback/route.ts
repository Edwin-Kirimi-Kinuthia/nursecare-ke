import { NextResponse } from "next/server";
import { jengaCallbackSchema } from "@carebora/shared";
import { settlementService } from "@carebora/core";

/**
 * POST /api/v1/payments/jenga/callback — Jenga M-Pesa STK confirmation callback
 * and IPN. Always returns 200 so Jenga doesn't retry on our errors; the actual
 * match/settle happens inside settlementService (which re-confirms via the
 * order-status query endpoint since this callback is unsigned).
 */
export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const payload = jengaCallbackSchema.parse(raw);
    await settlementService.handleJengaStkCallback(payload);
  } catch {
    // swallow — Jenga just needs a 200
  }
  return NextResponse.json({ status: true, code: "0", message: "Received" });
}
