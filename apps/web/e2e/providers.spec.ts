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

test.describe("Pharmacy marketplace (multi-vendor)", () => {
  test("GET /storefront/drugs returns the drug catalogue with best price + nearest vendor", async ({ request }) => {
    const res = await request.get("/api/v1/storefront/drugs");
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.drugs.length).toBeGreaterThan(0);
    expect(data.drugs[0]).toHaveProperty("bestPriceKes");
    expect(data.drugs[0]).toHaveProperty("vendorCount");
  });

  test("GET /storefront/drugs?requiresPrescription=false only returns OTC", async ({ request }) => {
    const res = await request.get("/api/v1/storefront/drugs?requiresPrescription=false");
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    for (const d of data.drugs) {
      expect(d.requiresPrescription).toBe(false);
    }
  });

  test("GET /storefront/drugs ranks by distance when lat/lng given", async ({ request }) => {
    // Nairobi CBD — seed data places vendors at varying distances from here.
    const res = await request.get("/api/v1/storefront/drugs?lat=-1.2864&lng=36.8172");
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    const withDistance = data.drugs.filter((d: { nearestVendor?: { distanceKm?: number } }) => d.nearestVendor?.distanceKm != null);
    expect(withDistance.length).toBeGreaterThan(0);
  });

  test("GET /storefront/drugs/:id for unknown id → 404", async ({ request }) => {
    const res = await request.get("/api/v1/storefront/drugs/00000000-0000-0000-0000-000000000000");
    expect(res.status()).toBe(404);
  });

  test("GET /storefront/drugs/:id/offers lists every vendor's offer, ranked by distance then price", async ({ request }) => {
    const listRes = await request.get("/api/v1/storefront/drugs");
    const { data } = await listRes.json();
    const drugId = data.drugs[0].drugId;

    const res = await request.get(`/api/v1/storefront/drugs/${drugId}/offers?lat=-1.2864&lng=36.8172`);
    expect(res.status()).toBe(200);
    const offers = (await res.json()).data.offers;
    expect(Array.isArray(offers)).toBe(true);
    expect(offers.length).toBeGreaterThan(0);
    expect(offers[0]).toHaveProperty("orgName");
    expect(offers[0]).toHaveProperty("priceKes");
  });
});
