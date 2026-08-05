import { test, expect } from "@playwright/test";

/**
 * Pharmacy marketplace checkout E2E — a cart of storefront listings (which may
 * span multiple vendor pharmacies) becomes one Order with one Payment and one
 * VendorOrder per org. Verifies up to the point of payment completion (which
 * requires either the /mpesa/simulate helper or the till verification flow).
 */

const UNIQUE = Date.now();
const EMAIL = `orders+${UNIQUE}@carebora.test`;
const PASSWORD = "Test1234!";

test.describe.configure({ mode: "serial" });

let accessToken = "";
let strangerToken = "";
let otcListingId = "";
let gatewayRef = "";

test.describe("Pharmacy marketplace checkout", () => {
  test("register patient", async ({ request }) => {
    const res = await request.post("/api/v1/auth/register", {
      data: { email: EMAIL, password: PASSWORD, fullName: "E2E Shopper", role: "patient" },
    });
    expect(res.status()).toBe(201);
    accessToken = (await res.json()).data.accessToken;
  });

  test("register a second, unrelated patient (for the payment-ownership check below)", async ({ request }) => {
    const res = await request.post("/api/v1/auth/register", {
      data: { email: `orders-stranger+${UNIQUE}@carebora.test`, password: PASSWORD, fullName: "E2E Stranger", role: "patient" },
    });
    expect(res.status()).toBe(201);
    strangerToken = (await res.json()).data.accessToken;
  });

  test("GET /storefront/drugs — OTC drugs are in the catalogue", async ({ request }) => {
    const res = await request.get("/api/v1/storefront/drugs?requiresPrescription=false");
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.drugs.length).toBeGreaterThan(0);
  });

  test("GET /storefront/drugs/:id/offers finds a purchasable listing", async ({ request }) => {
    const listRes = await request.get("/api/v1/storefront/drugs?requiresPrescription=false");
    const { data } = await listRes.json();
    const drugId = data.drugs[0].drugId;

    const res = await request.get(`/api/v1/storefront/drugs/${drugId}/offers`);
    expect(res.status()).toBe(200);
    const offers = (await res.json()).data.offers;
    expect(offers.length).toBeGreaterThan(0);
    otcListingId = offers[0].listingId;
  });

  test("POST /orders requires auth", async ({ request }) => {
    const res = await request.post("/api/v1/orders", {
      data: {
        items: [{ listingId: otcListingId, qty: 1 }],
        phoneNumber: "0712345678",
        deliveryAddress: "Test Address, Nairobi",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /orders with invalid listing id → 400", async ({ request }) => {
    const res = await request.post("/api/v1/orders", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        items: [{ listingId: "00000000-0000-0000-0000-000000000000", qty: 1 }],
        phoneNumber: "0712345678",
        deliveryAddress: "Test Address, Nairobi",
      },
    });
    expect([400, 503]).toContain(res.status());
  });

  test("POST /orders with empty items → 422", async ({ request }) => {
    const res = await request.post("/api/v1/orders", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        items: [],
        phoneNumber: "0712345678",
        deliveryAddress: "Test Address, Nairobi",
      },
    });
    expect(res.status()).toBe(422);
  });

  test("POST /orders checks out successfully and fans out into vendor orders + one payment", async ({ request }) => {
    const res = await request.post("/api/v1/orders", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        items: [{ listingId: otcListingId, qty: 2 }],
        phoneNumber: "0712345678",
        deliveryAddress: "Test Address, Nairobi",
      },
    });
    expect(res.status()).toBe(201);
    const { data } = await res.json();
    expect(data.vendorOrders.length).toBeGreaterThan(0);
    expect(data.payment).toHaveProperty("gatewayRef");
    expect(data.payment.status).toBe("pending");
    gatewayRef = data.payment.gatewayRef;
  });

  test("a stranger cannot submit a Till code for someone else's payment", async ({ request }) => {
    const res = await request.post("/api/v1/payments/till/submit", {
      headers: { Authorization: `Bearer ${strangerToken}` },
      data: { gatewayRef, code: "STRANGER1" },
    });
    expect(res.status()).toBe(403);
  });

  test("GET /orders lists patient orders", async ({ request }) => {
    const res = await request.get("/api/v1/orders", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(Array.isArray(data.orders)).toBe(true);
    expect(data.orders.length).toBeGreaterThan(0);
  });
});
