import { test, expect } from "@playwright/test";

/**
 * Provider directory tests.
 * These run against seed data so require the DB to have been seeded
 * (npm run db:seed from packages/db).
 */
test.describe("Provider directory", () => {
  test("GET /providers returns paginated list", async ({ request }) => {
    const res = await request.get("/api/v1/providers");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty("providers");
    expect(body.data).toHaveProperty("total");
    expect(Array.isArray(body.data.providers)).toBe(true);
  });

  test("GET /providers?specialty=General+Practice filters correctly", async ({ request }) => {
    const res = await request.get("/api/v1/providers?specialty=General+Practice");
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    for (const p of data.providers) {
      expect(p.specialty?.toLowerCase()).toContain("general");
    }
  });

  test("GET /providers?limit=2 respects limit", async ({ request }) => {
    const res = await request.get("/api/v1/providers?limit=2");
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.providers.length).toBeLessThanOrEqual(2);
  });

  test("GET /providers/:id for unknown id → 404", async ({ request }) => {
    const res = await request.get("/api/v1/providers/00000000-0000-0000-0000-000000000000");
    expect(res.status()).toBe(404);
  });
});

test.describe("Pharmacy catalogue", () => {
  test("GET /products returns product list", async ({ request }) => {
    const res = await request.get("/api/v1/products");
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.products.length).toBeGreaterThan(0);
    expect(data.products[0]).toHaveProperty("priceKes");
  });

  test("GET /products?requiresPrescription=false only returns OTC", async ({ request }) => {
    const res = await request.get("/api/v1/products?requiresPrescription=false");
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    for (const p of data.products) {
      expect(p.requiresPrescription).toBe(false);
    }
  });

  test("GET /products/:id for unknown id → 404", async ({ request }) => {
    const res = await request.get("/api/v1/products/00000000-0000-0000-0000-000000000000");
    expect(res.status()).toBe(404);
  });
});
