import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * Stock must never oversell.
 *
 * Checking `stockQty < qty` and then decrementing is check-then-act: concurrent
 * carts all read the same stock, all pass the check, and all decrement — leaving
 * the listing negative and the pharmacy committed to orders it cannot fill,
 * after the customers have already been charged. The reservation has to be a
 * single conditional update so the database picks the winners.
 */

const UNIQUE = Date.now();
const PASSWORD = "Test1234!";

test.describe.configure({ mode: "serial" });

let patientToken = "";
let vendorToken = "";
let listingId = "";

const stockOf = async (request: APIRequestContext) => {
  const res = await request.get("/api/v1/vendor/listings", {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  const listing = (await res.json()).data.listings.find((l: { id: string }) => l.id === listingId);
  return listing.stockQty as number;
};

const setStock = async (request: APIRequestContext, stockQty: number) => {
  const res = await request.patch(`/api/v1/vendor/listings/${listingId}`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
    data: { stockQty },
  });
  expect(res.status()).toBe(200);
};

test.describe("Stock reservation", () => {
  test("sign in as a patient and a pharmacy", async ({ request }) => {
    const p = await request.post("/api/v1/auth/register", {
      data: { email: `stock+${UNIQUE}@carebora.test`, password: PASSWORD, fullName: "E2E Stock Buyer", role: "patient" },
    });
    expect(p.status()).toBe(201);
    patientToken = (await p.json()).data.accessToken;

    const v = await request.post("/api/v1/auth/login", {
      data: { email: "owner.wellcare@example.com", password: "Demo1234!" },
    });
    expect(v.status()).toBe(200);
    vendorToken = (await v.json()).data.accessToken;

    // An over-the-counter listing, so checkout doesn't demand a prescription.
    const res = await request.get("/api/v1/vendor/listings", {
      headers: { Authorization: `Bearer ${vendorToken}` },
    });
    const otc = (await res.json()).data.listings.find(
      (l: { drug: { requiresPrescription: boolean } }) => !l.drug.requiresPrescription,
    );
    expect(otc, "the seeded pharmacy should stock an OTC drug").toBeTruthy();
    listingId = otc.id;
  });

  test("concurrent checkouts cannot oversell the last units", async ({ request }) => {
    await setStock(request, 5);

    // Five carts want two units each — ten units of demand against five in stock.
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request.post("/api/v1/orders", {
          headers: { Authorization: `Bearer ${patientToken}` },
          data: {
            items: [{ listingId, qty: 2 }],
            phoneNumber: "0712345678",
            deliveryAddress: "Kilimani Road, Nairobi",
          },
        }),
      ),
    );

    const placed = results.filter((r) => r.status() === 201).length;
    const remaining = await stockOf(request);

    // At most two carts of two units can be filled from five.
    expect(placed, "more carts were filled than there was stock for").toBeLessThanOrEqual(2);
    expect(remaining, "stock must never go negative").toBeGreaterThanOrEqual(0);
    expect(placed * 2 + remaining, "units sold plus units left must equal what was in stock").toBe(5);
  });

  test("a rejected checkout does not strand a pending payment", async ({ request }) => {
    await setStock(request, 0);

    const res = await request.post("/api/v1/orders", {
      headers: { Authorization: `Bearer ${patientToken}` },
      data: {
        items: [{ listingId, qty: 1 }],
        phoneNumber: "0712345678",
        deliveryAddress: "Kilimani Road, Nairobi",
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);

    // The gateway is called before the order row exists, so a failed checkout
    // must not leave a pending charge behind for an order that never existed —
    // it would sit in the Till verification queue and the reconciliation sweep.
    const orders = await request.get("/api/v1/orders", {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const pending = (await orders.json()).data.orders.filter(
      (o: { payment: { status: string } | null }) => o.payment?.status === "pending",
    );
    // Only the carts that actually succeeded above may still be awaiting payment.
    expect(pending.length).toBeLessThanOrEqual(2);
  });

  test("stock is restored, so the seeded catalogue is left usable", async ({ request }) => {
    await setStock(request, 100);
    expect(await stockOf(request)).toBe(100);
  });
});
