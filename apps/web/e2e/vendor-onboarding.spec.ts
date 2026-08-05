import { test, expect } from "@playwright/test";

/**
 * Vendor onboarding E2E — applying creates a pending Organization that is
 * invisible on the storefront until an admin approves it. Confirms the
 * approval gate actually gates the marketplace, not just the org's own status
 * field. Uses admin@carebora.ke (seeded, password Demo1234!) for review.
 */

const UNIQUE = Date.now();
const OWNER_EMAIL = `vendor-owner+${UNIQUE}@carebora.test`;
const PASSWORD = "Test1234!";
const ORG_NAME = `E2E Test Pharmacy ${UNIQUE}`;

test.describe.configure({ mode: "serial" });

let ownerToken = "";
let adminToken = "";
let patientToken = "";
let orgId = "";
let drugId = "";
let listingId = "";

test.describe("Vendor onboarding", () => {
  test("login admin", async ({ request }) => {
    const res = await request.post("/api/v1/auth/login", {
      data: { email: "admin@carebora.ke", password: "Demo1234!" },
    });
    expect(res.status()).toBe(200);
    adminToken = (await res.json()).data.accessToken;
  });

  test("POST /vendors/apply creates a pending pharmacy org", async ({ request }) => {
    const res = await request.post("/api/v1/vendors/apply", {
      data: {
        fullName: "E2E Vendor Owner",
        email: OWNER_EMAIL,
        password: PASSWORD,
        orgType: "pharmacy",
        orgName: ORG_NAME,
        licenceNumber: `PPB-${UNIQUE}`,
        branch: {
          name: "Main Branch",
          county: "Nairobi",
          town: "CBD",
          latitude: -1.2864,
          longitude: 36.8172,
        },
      },
    });
    expect(res.status()).toBe(201);
    const { data } = await res.json();
    expect(data.user.role).toBe("vendor");
    ownerToken = data.accessToken;
  });

  test("GET /vendor/org shows the org as pending", async ({ request }) => {
    const res = await request.get("/api/v1/vendor/org", {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.status).toBe("pending");
    orgId = data.id;
  });

  test("vendor claims a drug and lists it for sale", async ({ request }) => {
    const res = await request.post("/api/v1/vendor/listings", {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: {
        drug: { name: `E2E Test Drug ${UNIQUE}`, form: "tablet", category: "Pain Relief", requiresPrescription: false },
        priceKes: 199,
        stockQty: 50,
      },
    });
    expect(res.status()).toBe(201);
    const { data } = await res.json();
    drugId = data.drugId;
    listingId = data.id;
  });

  test("the listing does not appear on the public storefront while the org is pending", async ({ request }) => {
    const res = await request.get(`/api/v1/storefront/drugs?search=${encodeURIComponent("E2E Test Drug " + UNIQUE)}`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.drugs.length).toBe(0);
  });

  test("a non-admin cannot review organizations", async ({ request }) => {
    const res = await request.post(`/api/v1/admin/organizations/${orgId}/review`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: { status: "approved" },
    });
    expect(res.status()).toBe(403);
  });

  test("the org appears in the admin review queue", async ({ request }) => {
    const res = await request.get("/api/v1/admin/organizations?status=pending", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    const found = data.organizations.find((o: { id: string }) => o.id === orgId);
    expect(found).toBeTruthy();
  });

  test("admin approves the organization", async ({ request }) => {
    const res = await request.post(`/api/v1/admin/organizations/${orgId}/review`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: "approved" },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.status).toBe("approved");
  });

  test("the listing now appears on the public storefront", async ({ request }) => {
    const res = await request.get(`/api/v1/storefront/drugs?search=${encodeURIComponent("E2E Test Drug " + UNIQUE)}`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.drugs.length).toBe(1);
    expect(data.drugs[0].drugId).toBe(drugId);
    expect(data.drugs[0].nearestVendor.orgName).toBe(ORG_NAME);
  });

  test("suspension actually freezes the vendor — dashboard access and checkout both blocked", async ({ request }) => {
    const patientRes = await request.post("/api/v1/auth/register", {
      data: { email: `vendor-susp-patient+${UNIQUE}@carebora.test`, password: PASSWORD, fullName: "E2E Susp Patient", role: "patient" },
    });
    expect(patientRes.status()).toBe(201);
    patientToken = (await patientRes.json()).data.accessToken;

    const suspendRes = await request.post(`/api/v1/admin/organizations/${orgId}/review`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: "suspended" },
    });
    expect(suspendRes.status()).toBe(200);

    // The vendor's own dashboard must be frozen, not just hidden from patients.
    const dashRes = await request.get("/api/v1/vendor/org", {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(dashRes.status()).toBe(403);

    // A patient with a cached listingId (from before suspension) must not be
    // able to check out against a suspended vendor.
    const checkoutRes = await request.post("/api/v1/orders", {
      headers: { Authorization: `Bearer ${patientToken}` },
      data: { items: [{ listingId, qty: 1 }], phoneNumber: "0712345678", deliveryAddress: "Test Address, Nairobi" },
    });
    expect(checkoutRes.status()).toBe(400);

    // Restore for the tests that follow.
    const reapproveRes = await request.post(`/api/v1/admin/organizations/${orgId}/review`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: "approved" },
    });
    expect(reapproveRes.status()).toBe(200);
    const dashRestoredRes = await request.get("/api/v1/vendor/org", {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(dashRestoredRes.status()).toBe(200);
  });

  test("POST /vendors/apply with a duplicate email → 409", async ({ request }) => {
    const res = await request.post("/api/v1/vendors/apply", {
      data: {
        fullName: "Duplicate Vendor",
        email: OWNER_EMAIL,
        password: PASSWORD,
        orgType: "pharmacy",
        orgName: "Duplicate Co",
        licenceNumber: "PPB-DUP",
        branch: { name: "Branch", county: "Nairobi", latitude: -1.28, longitude: 36.8 },
      },
    });
    expect(res.status()).toBe(409);
  });
});
