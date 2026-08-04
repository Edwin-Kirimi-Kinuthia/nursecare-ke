import { NextResponse } from "next/server";
import { jengaPgwCallbackSchema } from "@carebora/shared";
import { settlementService } from "@carebora/core";

/**
 * GET /api/v1/payments/jenga/pgw/callback — the browser redirect Jenga PGW sends
 * the customer back to after hosted checkout, carrying the result as query params
 * (not a server-to-server webhook). Verifies `hash` before settling, then bounces
 * the customer to a friendly page.
 */
export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  const parsed = jengaPgwCallbackSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.redirect(`${appUrl}/pharmacy?payment=error`);
  }

  const ok = await settlementService.handleJengaPgwCallback(parsed.data).catch(() => false);
  return NextResponse.redirect(`${appUrl}/pharmacy?payment=${ok && parsed.data.status === "paid" ? "success" : "failed"}`);
}
