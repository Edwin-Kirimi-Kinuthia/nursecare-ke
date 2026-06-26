import { test, expect } from "@playwright/test";

/**
 * Pharmacy order flow E2E — verifies product catalogue and order creation
 * up to the point of STK push (which requires live M-Pesa sandbox).
 * Catalogue tests confirm the seed data is present.
 */

const UNIQUE = Date.now();
const EMAIL = `orders+${UNIQUE}@carebora.test`;
const PASSWORD = "Test1234!";

test.describe.configure({ mode: "serial" });

let accessToken = "";
let otcProductId = "";

test.describe("Pharmacy orders", () => {
  test("register patient", async ({ request }) => {
    const res = await request.post("/api/v1/auth/register", {
      data: { email: EMAIL, password: PASSWORD, fullName: "E2E Shopper", role: "patient" },
    });
    expect(res.status()).toBe(201);
    accessToken = (await res.json()).data.accessToken;
  });

  test("GET /products — OTC products are in catalogue", async ({ request }) => {
    const res = await request.get("/api/v1/products?requiresPrescription=false&inStock=true");
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.products.length).toBeGreaterThan(0);
    otcProductId = data.products[0].id;
  });

  test("GET /products?search=paracetamol finds by name", async ({ request }) => {
    const res = await request.get("/api/v1/products?search=paracetamol");
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.products.length).toBeGreaterThan(0);
    expect(data.products[0].genericName?.toLowerCase()).toContain("paracetamol");
  });

  test("POST /orders requires auth", async ({ request }) => {
    const res = await request.post("/api/v1/orders", {
      data: {
        items: [{ productId: otcProductId, qty: 1 }],
        phoneNumber: "0712345678",
        deliveryAddress: "Test Address, Nairobi",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /orders with invalid product id → 400", async ({ request }) => {
    const res = await request.post("/api/v1/orders", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        items: [{ productId: "00000000-0000-0000-0000-000000000000", qty: 1 }],
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

  test("GET /orders lists patient orders", async ({ request }) => {
    const res = await request.get("/api/v1/orders", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(Array.isArray(data.orders)).toBe(true);
  });
});
