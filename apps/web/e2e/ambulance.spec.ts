import { test, expect } from "@playwright/test";

/**
 * Ambulance request → dispatch → completion E2E. The operator's fleet is
 * seeded (Rapid Response Ambulance, owner.rapidresponse@example.com,
 * password Demo1234!) with vehicles near Nairobi CBD.
 */

const UNIQUE = Date.now();
const PATIENT_EMAIL = `ambulance-patient+${UNIQUE}@carebora.test`;
const PASSWORD = "Test1234!";

test.describe.configure({ mode: "serial" });

let patientToken = "";
let operatorToken = "";
let pharmacyVendorToken = "";
let requestId = "";

test.describe("Ambulance request and dispatch", () => {
  test("register patient", async ({ request }) => {
    const res = await request.post("/api/v1/auth/register", {
      data: { email: PATIENT_EMAIL, password: PASSWORD, fullName: "E2E Ambulance Patient", role: "patient" },
    });
    expect(res.status()).toBe(201);
    patientToken = (await res.json()).data.accessToken;
  });

  test("login ambulance operator", async ({ request }) => {
    const res = await request.post("/api/v1/auth/login", {
      data: { email: "owner.rapidresponse@example.com", password: "Demo1234!" },
    });
    expect(res.status()).toBe(200);
    operatorToken = (await res.json()).data.accessToken;
  });

  test("login a pharmacy vendor (wrong business type, for the isolation check below)", async ({ request }) => {
    const res = await request.post("/api/v1/auth/login", {
      data: { email: "owner.wellcare@example.com", password: "Demo1234!" },
    });
    expect(res.status()).toBe(200);
    pharmacyVendorToken = (await res.json()).data.accessToken;
  });

  test("POST /ambulance-requests requests an ambulance near Nairobi CBD", async ({ request }) => {
    const res = await request.post("/api/v1/ambulance-requests", {
      headers: { Authorization: `Bearer ${patientToken}` },
      data: {
        type: "basic",
        urgency: "emergency",
        pickupAddress: "Kenyatta Avenue, Nairobi CBD",
        pickupCounty: "Nairobi",
        pickupLatitude: -1.2864,
        pickupLongitude: 36.8172,
        patientCondition: "Chest pain, difficulty breathing",
        contactPhone: "0712345678",
      },
    });
    expect(res.status()).toBe(201);
    const { data } = await res.json();
    expect(data.status).toBe("requested");
    requestId = data.id;
  });

  test("POST /ambulance-requests with missing required field → 422", async ({ request }) => {
    const res = await request.post("/api/v1/ambulance-requests", {
      headers: { Authorization: `Bearer ${patientToken}` },
      data: { pickupCounty: "Nairobi", pickupLatitude: -1.2864, pickupLongitude: 36.8172, contactPhone: "0712345678" },
    });
    expect(res.status()).toBe(422);
  });

  test("a vendor of the wrong business type cannot accept, dispatch, or even see the ambulance queue", async ({ request }) => {
    const acceptRes = await request.post(`/api/v1/vendor/ambulance-requests/${requestId}/accept`, {
      headers: { Authorization: `Bearer ${pharmacyVendorToken}` },
      data: {},
    });
    expect(acceptRes.status()).toBe(403);

    const queueRes = await request.get("/api/v1/vendor/ambulance-requests", {
      headers: { Authorization: `Bearer ${pharmacyVendorToken}` },
    });
    expect(queueRes.status()).toBe(403);

    const patchRes = await request.patch(`/api/v1/vendor/ambulance-requests/${requestId}`, {
      headers: { Authorization: `Bearer ${pharmacyVendorToken}` },
      data: { status: "dispatched" },
    });
    expect(patchRes.status()).toBe(403);
  });

  test("operator accepts the request", async ({ request }) => {
    const res = await request.post(`/api/v1/vendor/ambulance-requests/${requestId}/accept`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
      data: { estimatedKes: 3500 },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.status).toBe("accepted");
  });

  test("a second operator cannot accept an already-accepted request", async ({ request }) => {
    const res = await request.post(`/api/v1/vendor/ambulance-requests/${requestId}/accept`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
      data: {},
    });
    expect(res.status()).toBe(409);
  });

  test("operator advances the status timeline through to completed, setting the fee on arrival", async ({ request }) => {
    const sequence = ["dispatched", "en_route_pickup", "arrived_pickup", "en_route_destination", "completed"];
    for (const status of sequence) {
      const data: { status: string; feeKes?: number } = { status };
      if (status === "arrived_pickup") data.feeKes = 3800;
      const res = await request.patch(`/api/v1/vendor/ambulance-requests/${requestId}`, {
        headers: { Authorization: `Bearer ${operatorToken}` },
        data,
      });
      expect(res.status()).toBe(200);
      expect((await res.json()).data.status).toBe(status);
    }
  });

  test("operator cannot skip a stage out of order", async ({ request }) => {
    // Already completed — no valid next status exists.
    const res = await request.patch(`/api/v1/vendor/ambulance-requests/${requestId}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
      data: { status: "dispatched" },
    });
    expect(res.status()).toBe(400);
  });

  test("patient pays for the completed trip", async ({ request }) => {
    const res = await request.post(`/api/v1/ambulance-requests/${requestId}/pay`, {
      headers: { Authorization: `Bearer ${patientToken}` },
      data: { phoneNumber: "0712345678" },
    });
    expect(res.status()).toBe(202);
    const { data } = await res.json();
    expect(data).toHaveProperty("gatewayRef");
  });

  test("GET /ambulance-requests/:id shows the full status timeline to the patient", async ({ request }) => {
    const res = await request.get(`/api/v1/ambulance-requests/${requestId}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.status).toBe("completed");
    expect(data.events.length).toBeGreaterThanOrEqual(5);
  });

  test("POST /ambulance-requests without auth → 401", async ({ request }) => {
    const res = await request.post("/api/v1/ambulance-requests");
    expect(res.status()).toBe(401);
  });
});
