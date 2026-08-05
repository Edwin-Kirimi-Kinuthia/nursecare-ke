import { test, expect } from "@playwright/test";

/**
 * Jenga webhook security E2E. Neither callback route requires auth (Jenga
 * calls them directly), so their safety comes entirely from signature/hash
 * verification and replay dedupe — this suite hits them the way an attacker
 * (or a flaky retry) would, without needing real Jenga UAT credentials.
 *
 * No JENGA_MERCHANT_CODE is configured in this env (see .env.example), so
 * verifyPgwCallback() short-circuits to false for every request — which is
 * itself the fail-closed behaviour we're asserting: an unconfigured/unreachable
 * verifier must never be treated as "verified".
 */

test.describe("Jenga payment webhook security", () => {
  test("PGW callback with a bogus hash is rejected, not settled", async ({ request }) => {
    const res = await request.get("/api/v1/payments/jenga/pgw/callback", {
      params: {
        transactionId: `E2E-TXN-${Date.now()}`,
        status: "paid",
        amount: "1000",
        orderReference: "ORD-does-not-exist",
        hash: "not-a-real-signature",
      },
    });
    expect(res.ok()).toBe(true);
    expect(res.url()).toContain("payment=failed");
  });

  test("PGW callback missing required fields redirects to a generic error, not a 500", async ({ request }) => {
    const res = await request.get("/api/v1/payments/jenga/pgw/callback", {
      params: { status: "paid" },
    });
    expect(res.ok()).toBe(true);
    expect(res.url()).toContain("payment=error");
  });

  test("STK callback always returns 200 regardless of payload validity (Jenga must not retry)", async ({ request }) => {
    const res = await request.post("/api/v1/payments/jenga/callback", {
      data: { garbage: true, no: "structure" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe(true);
  });

  test("a forged STK 'success' callback for an unknown reference does not 500 or leak whether it matched", async ({ request }) => {
    const res = await request.post("/api/v1/payments/jenga/callback", {
      data: {
        customer: { reference: "ORD-forged-does-not-exist" },
        transaction: { status: "SUCCESS" },
      },
    });
    expect(res.status()).toBe(200);
    // Same generic ack either way — the caller learns nothing about whether
    // a payment with that reference exists or was affected.
    const body = await res.json();
    expect(body).toEqual({ status: true, code: "0", message: "Received" });
  });

  test("payments/mpesa/simulate (dev-only helper) is unreachable without auth", async ({ request }) => {
    const res = await request.post("/api/v1/payments/mpesa/simulate", {
      data: { gatewayRef: "ANYTHING" },
    });
    expect(res.status()).toBe(401);
  });
});
