import { test, expect } from "@playwright/test";

/**
 * M9 E2E — AI triage + reviews. Covers public/auth access, validation, and the
 * review lifecycle guards. The review happy-path (create + rating recompute) is
 * intentionally not exercised here so demo providers' review counts stay stable.
 */

const UNIQUE = Date.now();
const EMAIL = `m9+${UNIQUE}@carebora.test`;
const PASSWORD = "Test1234!";

test.describe.configure({ mode: "serial" });

let accessToken = "";
let providerId = "";
let appointmentId = "";

test.describe("M9 — AI & Reviews", () => {
  test("register patient", async ({ request }) => {
    const res = await request.post("/api/v1/auth/register", {
      data: { email: EMAIL, password: PASSWORD, fullName: "E2E M9", role: "patient" },
    });
    expect(res.status()).toBe(201);
    accessToken = (await res.json()).data.accessToken;
  });

  // ── AI ──────────────────────────────────────────────────────────────────
  test("POST /ai/provider-match is public and returns a recommendation", async ({ request }) => {
    const res = await request.post("/api/v1/ai/provider-match", {
      data: { concern: "I need physiotherapy for a sprained ankle" },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.recommendedSpecialty).toBeTruthy();
    expect(Array.isArray(data.alternatives)).toBe(true);
  });

  test("POST /ai/provider-match with short concern → 422", async ({ request }) => {
    const res = await request.post("/api/v1/ai/provider-match", { data: { concern: "x" } });
    expect(res.status()).toBe(422);
  });

  test("POST /ai/symptom-check without auth → 401", async ({ request }) => {
    const res = await request.post("/api/v1/ai/symptom-check", {
      data: { symptoms: "persistent cough and fever" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /ai/symptom-check with auth returns triage result", async ({ request }) => {
    const res = await request.post("/api/v1/ai/symptom-check", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { symptoms: "persistent cough, mild fever, chest tightness for 3 days", patientAge: 34 },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(["routine", "urgent", "emergency"]).toContain(data.urgency);
    expect(data.recommendedSpecialty).toBeTruthy();
    expect(data.disclaimer).toBeTruthy();
  });

  test("POST /ai/symptom-check with too-short symptoms → 422", async ({ request }) => {
    const res = await request.post("/api/v1/ai/symptom-check", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { symptoms: "x" },
    });
    expect(res.status()).toBe(422);
  });

  // ── Reviews ─────────────────────────────────────────────────────────────
  test("GET /providers/:id/reviews is public and paginated", async ({ request }) => {
    const list = await request.get("/api/v1/providers?verificationStatus=verified&limit=1");
    providerId = (await list.json()).data.providers[0].userId;

    const res = await request.get(`/api/v1/providers/${providerId}/reviews`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(Array.isArray(data.reviews)).toBe(true);
    expect(typeof data.total).toBe("number");
  });

  test("GET /admin/reviews without auth → 401", async ({ request }) => {
    const res = await request.get("/api/v1/admin/reviews");
    expect(res.status()).toBe(401);
  });

  test("GET /admin/reviews with patient token → 403", async ({ request }) => {
    const res = await request.get("/api/v1/admin/reviews", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test("POST review on unknown appointment → 404", async ({ request }) => {
    const res = await request.post(
      "/api/v1/appointments/00000000-0000-0000-0000-000000000000/review",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: { rating: 5, comment: "great" },
      },
    );
    expect(res.status()).toBe(404);
  });

  test("POST review with invalid rating → 422", async ({ request }) => {
    const res = await request.post(
      "/api/v1/appointments/00000000-0000-0000-0000-000000000000/review",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: { rating: 9 },
      },
    );
    expect(res.status()).toBe(422);
  });

  test("POST review on a non-completed appointment → 400", async ({ request }) => {
    // Book a fresh slot so the appointment is in `requested` status.
    const from = new Date().toISOString();
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const slotsRes = await request.get(`/api/v1/providers/${providerId}/slots?from=${from}&to=${to}`);
    const slotsData = (await slotsRes.json()).data;
    const slots: { id: string; isBooked: boolean }[] = Array.isArray(slotsData) ? slotsData : slotsData.slots ?? [];
    const free = slots.find((s) => !s.isBooked);
    test.skip(!free, "No free slot to book — run db:seed");

    const apptRes = await request.post("/api/v1/appointments", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { slotId: free!.id, appointmentType: "teleconsult" },
    });
    expect(apptRes.status()).toBe(201);
    appointmentId = (await apptRes.json()).data.id;

    const res = await request.post(`/api/v1/appointments/${appointmentId}/review`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { rating: 5, comment: "too early" },
    });
    expect(res.status()).toBe(400);
  });
});
