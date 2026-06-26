import { test, expect } from "@playwright/test";

/**
 * Booking flow E2E — registers a patient, finds a verified provider,
 * fetches their slots, and books one. Depends on seed data.
 *
 * Run with: BASE_URL=https://nursecare-ke-five.vercel.app npx playwright test e2e/booking.spec.ts
 */

const UNIQUE = Date.now();
const EMAIL = `booking+${UNIQUE}@carebora.test`;
const PASSWORD = "Test1234!";

test.describe.configure({ mode: "serial" });

let accessToken = "";
let slotId = "";

test.describe("Booking flow", () => {
  test("register patient", async ({ request }) => {
    const res = await request.post("/api/v1/auth/register", {
      data: { email: EMAIL, password: PASSWORD, fullName: "E2E Booker", role: "patient" },
    });
    expect(res.status()).toBe(201);
    const { data } = await res.json();
    accessToken = data.accessToken;
    expect(accessToken).toBeTruthy();
  });

  test("GET /providers returns verified providers", async ({ request }) => {
    const res = await request.get("/api/v1/providers?verificationStatus=verified");
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.providers.length).toBeGreaterThan(0);
  });

  test("GET /providers/:id returns provider profile", async ({ request }) => {
    // Get a verified provider from seed data
    const listRes = await request.get("/api/v1/providers?verificationStatus=verified&limit=1");
    const { data: listData } = await listRes.json();
    const provider = listData.providers[0];
    expect(provider).toBeTruthy();

    const res = await request.get(`/api/v1/providers/${provider.userId}`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.specialty).toBeTruthy();
    expect(data.consultationFeeKes).toBeGreaterThan(0);
  });

  test("GET /providers/:id/slots returns bookable slots", async ({ request }) => {
    const listRes = await request.get("/api/v1/providers?verificationStatus=verified&limit=1");
    const { data: listData } = await listRes.json();
    const provider = listData.providers[0];

    const from = new Date().toISOString();
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request.get(
      `/api/v1/providers/${provider.userId}/slots?from=${from}&to=${to}`,
    );
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    // slots endpoint returns the array directly as data
    const slots: { isBooked: boolean; id: string }[] = Array.isArray(data) ? data : data.slots ?? [];
    expect(slots.length).toBeGreaterThan(0);

    // Pick a free slot for the booking test
    const free = slots.find((s) => !s.isBooked);
    if (free) slotId = free.id;
  });

  test("POST /appointments books a slot (patient)", async ({ request }) => {
    if (!slotId) {
      test.skip(true, "No free slot available — run db:seed to generate slots");
      return;
    }
    const res = await request.post("/api/v1/appointments", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { slotId, appointmentType: "teleconsult", patientNotes: "E2E test booking" },
    });
    expect(res.status()).toBe(201);
    const { data } = await res.json();
    expect(data.status).toBe("requested");
    expect(data.slotId).toBe(slotId);
  });

  test("POST /appointments with same slot → 409 conflict", async ({ request }) => {
    if (!slotId) {
      test.skip(true, "No slot to double-book");
      return;
    }
    const res = await request.post("/api/v1/appointments", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { slotId, appointmentType: "teleconsult" },
    });
    expect(res.status()).toBe(409);
  });

  test("GET /appointments lists patient appointments", async ({ request }) => {
    const res = await request.get("/api/v1/appointments", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(Array.isArray(data.appointments)).toBe(true);
    expect(data.appointments.length).toBeGreaterThan(0);
  });

  test("GET /appointments without token → 401", async ({ request }) => {
    const res = await request.get("/api/v1/appointments");
    expect(res.status()).toBe(401);
  });
});
