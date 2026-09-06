import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * Refund correctness — money bugs are the expensive kind, and both of these were
 * live before being caught in a pre-launch audit.
 *
 * 1. A refund must reverse the whole split, not just the gross. Posting only a
 *    negative gross_sale leaves platform_fee and vendor_payout standing, so a
 *    refunded sale still counts as platform revenue and still pays the vendor.
 * 2. Concurrent refunds must not both succeed. `if (status !== "completed")`
 *    followed by a write is check-then-act: five simultaneous calls all read
 *    "completed" and each posts its own reversals, driving the vendor's payout
 *    balance far negative.
 */

const UNIQUE = Date.now();
const PASSWORD = "Test1234!";

test.describe.configure({ mode: "serial" });

let patientToken = "";
let adminToken = "";

async function paidMultiVendorOrder(request: APIRequestContext, code: string) {
  // Two vendors in one cart, so settlement writes a split per vendor and the
  // refund has to reverse each of them.
  //
  // Pick a drug that actually has two stocked vendors rather than assuming the
  // first result does — ordering isn't guaranteed, and leftover single-vendor
  // test drugs from earlier runs can sort to the front, which silently skipped
  // this whole file.
  const drugsRes = await request.get(
    "/api/v1/storefront/drugs?requiresPrescription=false&lat=-1.2864&lng=36.8172&limit=50",
  );
  const drugs: Array<{ drugId: string; vendorCount: number }> = (await drugsRes.json()).data.drugs;
  const multiVendor = drugs.find((d) => d.vendorCount >= 2);
  expect(multiVendor, "seed should stock at least one drug at two or more pharmacies").toBeTruthy();

  const offersRes = await request.get(`/api/v1/storefront/drugs/${multiVendor!.drugId}/offers?lat=-1.2864&lng=36.8172`);
  const allOffers: Array<{ listingId: string; stockQty: number }> = (await offersRes.json()).data.offers;

  // Only offers that can actually be filled. Each run consumes stock, so a
  // fixed pick would eventually be rejected by the stock reservation — correctly,
  // but for reasons unrelated to refunds. Buy one unit per vendor to keep the
  // seeded catalogue usable for everything else in the suite.
  const offers = allOffers.filter((o) => o.stockQty >= 1);
  expect(offers.length, "needs two vendors with stock for the same drug").toBeGreaterThanOrEqual(2);

  const orderRes = await request.post("/api/v1/orders", {
    headers: { Authorization: `Bearer ${patientToken}` },
    data: {
      items: [
        { listingId: offers[0].listingId, qty: 1 },
        { listingId: offers[1].listingId, qty: 1 },
      ],
      phoneNumber: "0712345678",
      deliveryAddress: "Kilimani Road, Nairobi",
    },
  });
  expect(orderRes.status()).toBe(201);
  const order = (await orderRes.json()).data;
  expect(order.vendorOrders.length).toBe(2);

  await request.post("/api/v1/payments/till/submit", {
    headers: { Authorization: `Bearer ${patientToken}` },
    data: { gatewayRef: order.payment.gatewayRef, code },
  });
  const approve = await request.post("/api/v1/admin/payments/verifications", {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { id: order.payment.id, approve: true },
  });
  expect(approve.status()).toBe(200);

  return { paymentId: order.payment.id as string, amountKes: order.payment.amountKes as number };
}

/**
 * The payment's own ledger, netted per entry type.
 *
 * Deliberately scoped to one payment rather than reading the platform-wide
 * revenue stat: that counter moves whenever any other spec settles a payment,
 * so asserting on it fails under parallel workers for reasons that have nothing
 * to do with refunds.
 */
async function ledgerNet(request: APIRequestContext, paymentId: string) {
  const res = await request.get(`/api/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  expect(res.status()).toBe(200);
  const entries: Array<{ type: string; amountKes: number }> = (await res.json()).data.ledgerEntries ?? [];
  const net: Record<string, number> = {};
  for (const e of entries) net[e.type] = (net[e.type] ?? 0) + e.amountKes;
  return net;
}

test.describe("Refunds", () => {
  test("sign in", async ({ request }) => {
    const p = await request.post("/api/v1/auth/register", {
      data: { email: `refund+${UNIQUE}@carebora.test`, password: PASSWORD, fullName: "E2E Refund Patient", role: "patient" },
    });
    expect(p.status()).toBe(201);
    patientToken = (await p.json()).data.accessToken;

    const a = await request.post("/api/v1/auth/login", {
      data: { email: "admin@carebora.ke", password: "Demo1234!" },
    });
    expect(a.status()).toBe(200);
    adminToken = (await a.json()).data.accessToken;
  });

  test("a refund reverses the whole split, not just the gross", async ({ request }) => {
    const { paymentId, amountKes } = await paidMultiVendorOrder(request, `RFA${UNIQUE % 100000}`);

    const settled = await ledgerNet(request, paymentId);
    expect(settled.gross_sale).toBe(amountKes);
    expect(settled.platform_fee, "settling should earn commission").toBeGreaterThan(0);
    expect(settled.vendor_payout, "settling should owe the vendors").toBeGreaterThan(0);

    const refund = await request.post(`/api/v1/payments/${paymentId}/refund`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {},
    });
    expect(refund.status()).toBe(200);
    expect((await refund.json()).data.status).toBe("refunded");

    // The whole point: commission and vendor payout earned on a sale that was
    // handed back must not survive the refund.
    const after = await ledgerNet(request, paymentId);
    expect(after.platform_fee, "commission must be reversed").toBe(0);
    expect(after.vendor_payout, "vendor payout must be reversed").toBe(0);
    expect(after.gross_sale + after.refund, "gross must be cancelled out").toBe(0);
  });

  test("concurrent refunds settle exactly once", async ({ request }) => {
    const { paymentId } = await paidMultiVendorOrder(request, `RFB${UNIQUE % 100000}`);

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request.post(`/api/v1/payments/${paymentId}/refund`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: {},
        }),
      ),
    );

    const succeeded = results.filter((r) => r.status() === 200);
    expect(succeeded.length, "exactly one concurrent refund may win").toBe(1);

    // Five winners would each have posted a full set of reversals, driving the
    // vendors' payout balances far negative instead of to zero.
    const after = await ledgerNet(request, paymentId);
    expect(after.platform_fee, "over-reversal would undershoot zero").toBe(0);
    expect(after.vendor_payout).toBe(0);
    expect(after.gross_sale + after.refund).toBe(0);
  });

  test("a payment cannot be refunded twice, sequentially", async ({ request }) => {
    const { paymentId } = await paidMultiVendorOrder(request, `RFC${UNIQUE % 100000}`);

    const first = await request.post(`/api/v1/payments/${paymentId}/refund`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {},
    });
    expect(first.status()).toBe(200);

    const second = await request.post(`/api/v1/payments/${paymentId}/refund`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {},
    });
    expect(second.status()).toBe(400);
  });

  test("a patient cannot refund their own payment", async ({ request }) => {
    const { paymentId } = await paidMultiVendorOrder(request, `RFD${UNIQUE % 100000}`);
    const res = await request.post(`/api/v1/payments/${paymentId}/refund`, {
      headers: { Authorization: `Bearer ${patientToken}` },
      data: {},
    });
    expect(res.status()).toBe(403);
  });
});
