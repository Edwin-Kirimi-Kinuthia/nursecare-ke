import { seededSession } from "./support/auth";
import { test, expect } from "@playwright/test";

/**
 * Lab order E2E — browse nearby labs, order tests, and verify the payment
 * gate: a lab may not accept an order until its Payment is `completed`.
 * Uses Till mode (set for this repo's CI/dev, see .env.local / ci.yml) so
 * checkout completes via admin verification instead of a real gateway.
 * Uses owner.precisionlab@example.com (seeded lab vendor, password Demo1234!).
 */

const UNIQUE = Date.now();
const PATIENT_EMAIL = `lab-patient+${UNIQUE}@carebora.test`;
const PASSWORD = "Test12345!";

test.describe.configure({ mode: "serial" });

let patientToken = "";
let labToken = "";
let adminToken = "";
let pharmacyVendorToken = "";
let orgId = "";
let testId = "";
let orderId = "";
let itemId = "";
let gatewayRef = "";
let paymentId = "";

test.describe("Lab orders — payment-gated fulfilment", () => {
  test("register patient", async ({ request }) => {
    const res = await request.post("/api/v1/auth/register", {
      data: { email: PATIENT_EMAIL, password: PASSWORD, fullName: "E2E Lab Patient", role: "patient" },
    });
    expect(res.status()).toBe(201);
    patientToken = (await res.json()).data.accessToken;
  });

  test("use seeded lab, admin and pharmacy sessions", async () => {
    labToken = (await seededSession("owner.precisionlab@example.com")).accessToken;

    adminToken = (await seededSession("admin@carebora.ke")).accessToken;

    pharmacyVendorToken = (await seededSession("owner.wellcare@example.com")).accessToken;
  });

  test("GET /storefront/labs finds the seeded lab", async ({ request }) => {
    const res = await request.get("/api/v1/storefront/labs?lat=-1.2864&lng=36.8172");
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    const lab = data.labs.find((l: { orgName: string }) => l.orgName === "Precision Diagnostics Lab");
    expect(lab).toBeTruthy();
    orgId = lab.orgId;
  });

  test("GET /storefront/labs/:orgId/tests lists the test menu", async ({ request }) => {
    const res = await request.get(`/api/v1/storefront/labs/${orgId}/tests`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.tests.length).toBeGreaterThan(0);
    testId = data.tests[0].id;
  });

  test("POST /lab-orders creates an order with a pending payment", async ({ request }) => {
    const res = await request.post("/api/v1/lab-orders", {
      headers: { Authorization: `Bearer ${patientToken}` },
      data: { orgId, testIds: [testId], phoneNumber: "0712345678", collectionType: "walk_in" },
    });
    expect(res.status()).toBe(201);
    const { data } = await res.json();
    orderId = data.id;
    itemId = data.items[0].id;
    expect(data.status).toBe("requested");
    expect(data.payment.status).toBe("pending");
    gatewayRef = data.payment.gatewayRef;
    paymentId = data.payment.id;
  });

  test("a vendor of the wrong business type cannot touch the lab order or forge a result", async ({ request }) => {
    const patchRes = await request.patch(`/api/v1/vendor/lab-orders/${orderId}`, {
      headers: { Authorization: `Bearer ${pharmacyVendorToken}` },
      data: { status: "accepted" },
    });
    expect(patchRes.status()).toBe(403);

    const queueRes = await request.get("/api/v1/vendor/lab-orders", {
      headers: { Authorization: `Bearer ${pharmacyVendorToken}` },
    });
    expect(queueRes.status()).toBe(403);

    const resultRes = await request.post(`/api/v1/vendor/lab-orders/items/${itemId}/result`, {
      headers: { Authorization: `Bearer ${pharmacyVendorToken}` },
      data: { value: "Forged", flag: "normal" },
    });
    expect(resultRes.status()).toBe(403);
  });

  test("lab cannot accept the order before it is paid", async ({ request }) => {
    const res = await request.patch(`/api/v1/vendor/lab-orders/${orderId}`, {
      headers: { Authorization: `Bearer ${labToken}` },
      data: { status: "accepted" },
    });
    expect(res.status()).toBe(400);
  });

  test("patient submits Till payment code", async ({ request }) => {
    const res = await request.post("/api/v1/payments/till/submit", {
      headers: { Authorization: `Bearer ${patientToken}` },
      data: { gatewayRef, code: "QGJ5T5CI01" },
    });
    expect(res.status()).toBe(200);
  });

  test("admin approves the Till payment", async ({ request }) => {
    const res = await request.post("/api/v1/admin/payments/verifications", {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { id: paymentId, approve: true },
    });
    expect(res.status()).toBe(200);
  });

  test("lab can now accept, collect, and process the order", async ({ request }) => {
    for (const status of ["accepted", "sample_collected", "processing"]) {
      const res = await request.patch(`/api/v1/vendor/lab-orders/${orderId}`, {
        headers: { Authorization: `Bearer ${labToken}` },
        data: { status },
      });
      expect(res.status()).toBe(200);
      expect((await res.json()).data.status).toBe(status);
    }
  });

  test("entering the result auto-advances the order to resulted", async ({ request }) => {
    const res = await request.post(`/api/v1/vendor/lab-orders/items/${itemId}/result`, {
      headers: { Authorization: `Bearer ${labToken}` },
      data: { value: "Normal", flag: "normal" },
    });
    expect(res.status()).toBe(201);

    const listRes = await request.get("/api/v1/lab-orders", {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const { data } = await listRes.json();
    const order = data.orders.find((o: { id: string }) => o.id === orderId);
    expect(order.status).toBe("resulted");
    expect(order.items[0].result.value).toBe("Normal");
  });

  test("POST /lab-orders without auth → 401", async ({ request }) => {
    const res = await request.post("/api/v1/lab-orders", {
      data: { orgId, testIds: [testId], phoneNumber: "0712345678", collectionType: "walk_in" },
    });
    expect(res.status()).toBe(401);
  });
});
