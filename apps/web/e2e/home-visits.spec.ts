import { test, expect } from "@playwright/test";

/**
 * Home visit flow E2E — registers a patient, requests a visit, verifies listing.
 * The assign + pay steps require admin credentials and M-Pesa sandbox,
 * so they are tested at the API contract level only.
 */

const UNIQUE = Date.now();
const EMAIL = `hv+${UNIQUE}@carebora.test`;
const PASSWORD = "Test1234!";

test.describe.configure({ mode: "serial" });

let accessToken = "";
let visitId = "";

test.describe("Home visit flow", () => {
  test("register patient", async ({ request }) => {
    const res = await request.post("/api/v1/auth/register", {
      data: { email: EMAIL, password: PASSWORD, fullName: "E2E HV Patient", role: "patient" },
    });
    expect(res.status()).toBe(201);
    const { data } = await res.json();
    accessToken = data.accessToken;
  });

  test("POST /home-visits creates visit request", async ({ request }) => {
    const res = await request.post("/api/v1/home-visits", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        specialty: "nurse",
        urgency: "routine",
        description: "I need wound dressing for a post-surgery incision.",
        address: "House 5, Kilimani Road",
        county: "Nairobi",
      },
    });
    expect(res.status()).toBe(201);
    const { data } = await res.json();
    expect(data.status).toBe("pending");
    expect(data.specialty).toBe("nurse");
    visitId = data.id;
  });

  test("GET /home-visits returns patient's visits", async ({ request }) => {
    const res = await request.get("/api/v1/home-visits", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.visits.length).toBeGreaterThan(0);
    const visit = data.visits.find((v: { id: string }) => v.id === visitId);
    expect(visit).toBeTruthy();
  });

  test("GET /home-visits/:id returns visit detail", async ({ request }) => {
    const res = await request.get(`/api/v1/home-visits/${visitId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.id).toBe(visitId);
    expect(data.patientId).toBeTruthy();
    expect(data.patient.fullName).toBe("E2E HV Patient");
  });

  test("GET /home-visits without auth → 401", async ({ request }) => {
    const res = await request.get("/api/v1/home-visits");
    expect(res.status()).toBe(401);
  });

  test("PATCH /home-visits/:id cancel by patient", async ({ request }) => {
    const res = await request.patch(`/api/v1/home-visits/${visitId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { status: "cancelled" },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.status).toBe("cancelled");
  });

  test("POST /home-visits with invalid specialty → 422", async ({ request }) => {
    const res = await request.post("/api/v1/home-visits", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        specialty: "dentist",
        description: "Tooth pain",
        address: "123 Street",
        county: "Nairobi",
      },
    });
    expect(res.status()).toBe(422);
  });
});
