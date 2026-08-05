import { test, expect } from "@playwright/test";

/**
 * Multi-vendor marketplace E2E — a cart spanning two independent pharmacy
 * orgs becomes ONE checkout (one Order, one Payment) that fans out into ONE
 * VendorOrder per org. Each vendor sees and can only act on its own slice.
 */

const UNIQUE = Date.now();
const PASSWORD = "Test1234!";

test.describe.configure({ mode: "serial" });

let adminToken = "";
let vendorAToken = "";
let vendorBToken = "";
let listingAId = "";
let listingBId = "";
let patientToken = "";
let orderId = "";
let vendorOrderAId = "";
let vendorOrderBId = "";
let gatewayRef = "";
let paymentId = "";

async function createApprovedVendor(request: import("@playwright/test").APIRequestContext, label: "A" | "B", drugName: string, priceKes: number) {
  const email = `mkt-vendor-${label}+${UNIQUE}@carebora.test`;
  const applyRes = await request.post("/api/v1/vendors/apply", {
    data: {
      fullName: `E2E Vendor ${label}`,
      email,
      password: PASSWORD,
      orgType: "pharmacy",
      orgName: `E2E Marketplace Pharmacy ${label} ${UNIQUE}`,
      licenceNumber: `PPB-MKT-${label}-${UNIQUE}`,
      branch: { name: "Main Branch", county: "Nairobi", latitude: -1.2864, longitude: 36.8172 },
    },
  });
  expect(applyRes.status()).toBe(201);
  const { data } = await applyRes.json();
  const token = data.accessToken;

  const orgRes = await request.get("/api/v1/vendor/org", { headers: { Authorization: `Bearer ${token}` } });
  const orgId = (await orgRes.json()).data.id;

  const approveRes = await request.post(`/api/v1/admin/organizations/${orgId}/review`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { status: "approved" },
  });
  expect(approveRes.status()).toBe(200);

  const listingRes = await request.post("/api/v1/vendor/listings", {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      drug: { name: drugName, form: "tablet", category: "Pain Relief", requiresPrescription: false },
      priceKes,
      stockQty: 50,
    },
  });
  expect(listingRes.status()).toBe(201);
  const listingId = (await listingRes.json()).data.id;

  return { token, orgId, listingId };
}

test.describe("Multi-vendor cart split", () => {
  test("login admin", async ({ request }) => {
    const res = await request.post("/api/v1/auth/login", {
      data: { email: "admin@carebora.ke", password: "Demo1234!" },
    });
    expect(res.status()).toBe(200);
    adminToken = (await res.json()).data.accessToken;
  });

  test("onboard two approved vendors with distinct listings", async ({ request }) => {
    const a = await createApprovedVendor(request, "A", `E2E Marketplace Drug A ${UNIQUE}`, 120);
    vendorAToken = a.token;
    listingAId = a.listingId;

    const b = await createApprovedVendor(request, "B", `E2E Marketplace Drug B ${UNIQUE}`, 340);
    vendorBToken = b.token;
    listingBId = b.listingId;
  });

  test("register patient", async ({ request }) => {
    const res = await request.post("/api/v1/auth/register", {
      data: { email: `mkt-patient+${UNIQUE}@carebora.test`, password: PASSWORD, fullName: "E2E Marketplace Shopper", role: "patient" },
    });
    expect(res.status()).toBe(201);
    patientToken = (await res.json()).data.accessToken;
  });

  test("checkout with items from both vendors in one cart", async ({ request }) => {
    const res = await request.post("/api/v1/orders", {
      headers: { Authorization: `Bearer ${patientToken}` },
      data: {
        items: [
          { listingId: listingAId, qty: 2 }, // 240
          { listingId: listingBId, qty: 1 }, // 340
        ],
        phoneNumber: "0712345678",
        deliveryAddress: "Test Address, Nairobi",
      },
    });
    expect(res.status()).toBe(201);
    const { data } = await res.json();
    orderId = data.id;

    expect(data.vendorOrders.length).toBe(2);
    const orgNames = data.vendorOrders.map((vo: { organization: { name: string } }) => vo.organization.name).sort();
    expect(orgNames[0]).toContain("E2E Marketplace Pharmacy A");
    expect(orgNames[1]).toContain("E2E Marketplace Pharmacy B");

    // One payment for the whole cart.
    expect(data.payment.amountKes).toBe(240 + 340);
    gatewayRef = data.payment.gatewayRef;
    paymentId = data.payment.id;

    const voA = data.vendorOrders.find((vo: { organization: { name: string } }) => vo.organization.name.includes("Pharmacy A"));
    const voB = data.vendorOrders.find((vo: { organization: { name: string } }) => vo.organization.name.includes("Pharmacy B"));
    vendorOrderAId = voA.id;
    vendorOrderBId = voB.id;
  });

  test("vendor A sees only its own vendor order, not vendor B's", async ({ request }) => {
    const res = await request.get("/api/v1/vendor/orders", {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    const ids = data.vendorOrders.map((vo: { id: string }) => vo.id);
    expect(ids).toContain(vendorOrderAId);
    expect(ids).not.toContain(vendorOrderBId);
  });

  test("vendor A cannot patch vendor B's slice of the order", async ({ request }) => {
    const res = await request.patch(`/api/v1/vendor/orders/${vendorOrderBId}`, {
      headers: { Authorization: `Bearer ${vendorAToken}` },
      data: { status: "processing" },
    });
    expect(res.status()).toBe(404);
  });

  test("vendor B cannot advance its slice before the cart is paid", async ({ request }) => {
    const res = await request.patch(`/api/v1/vendor/orders/${vendorOrderBId}`, {
      headers: { Authorization: `Bearer ${vendorBToken}` },
      data: { status: "processing" },
    });
    expect(res.status()).toBe(400);
  });

  test("patient pays for the whole cart (one payment settles both vendor orders)", async ({ request }) => {
    // Till submit + admin approve — not the dev-only /mpesa/simulate helper,
    // which is unreachable once the app runs as a production build (`next
    // start` hardcodes NODE_ENV=production regardless of other env vars, and
    // CI's e2e job runs the production build, exactly like a real deploy).
    const submitRes = await request.post("/api/v1/payments/till/submit", {
      headers: { Authorization: `Bearer ${patientToken}` },
      data: { gatewayRef, code: "MKTPAY01" },
    });
    expect(submitRes.status()).toBe(200);

    const approveRes = await request.post("/api/v1/admin/payments/verifications", {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { id: paymentId, approve: true },
    });
    expect(approveRes.status()).toBe(200);
  });

  test("vendor B can advance its own slice", async ({ request }) => {
    const res = await request.patch(`/api/v1/vendor/orders/${vendorOrderBId}`, {
      headers: { Authorization: `Bearer ${vendorBToken}` },
      data: { status: "processing" },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.status).toBe("processing");
  });

  test("the patient sees both vendor slices under the one order", async ({ request }) => {
    const res = await request.get("/api/v1/orders", {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    const order = data.orders.find((o: { id: string }) => o.id === orderId);
    expect(order.vendorOrders.length).toBe(2);
  });
});
