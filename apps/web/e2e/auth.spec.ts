import { test, expect } from "@playwright/test";

const UNIQUE = Date.now();
const EMAIL = `e2e+${UNIQUE}@carebora.test`;
const PASSWORD = "Test1234!";

// register → login → me is a sequential journey sharing one account,
// so these must run in order (not parallel across workers).
test.describe.configure({ mode: "serial" });

test.describe("Auth flow", () => {
  test("register → returns user + sets cookies", async ({ request }) => {
    const res = await request.post("/api/v1/auth/register", {
      data: { email: EMAIL, password: PASSWORD, fullName: "E2E Patient", role: "patient" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.user.email).toBe(EMAIL);
    expect(body.data.user.role).toBe("patient");
    expect(typeof body.data.accessToken).toBe("string");
  });

  test("login with correct credentials → returns token", async ({ request }) => {
    const res = await request.post("/api/v1/auth/login", {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.user.email).toBe(EMAIL);
    expect(typeof body.data.accessToken).toBe("string");
  });

  test("login with wrong password → 401", async ({ request }) => {
    const res = await request.post("/api/v1/auth/login", {
      data: { email: EMAIL, password: "wrongpassword" },
    });
    expect(res.status()).toBe(401);
  });

  test("GET /auth/me with valid token → returns user", async ({ request }) => {
    // login fresh to get token
    const loginRes = await request.post("/api/v1/auth/login", {
      data: { email: EMAIL, password: PASSWORD },
    });
    const { data } = await loginRes.json();
    const token = data.accessToken;

    const res = await request.get("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.email).toBe(EMAIL);
  });

  test("GET /auth/me without token → 401", async ({ request }) => {
    const res = await request.get("/api/v1/auth/me");
    expect(res.status()).toBe(401);
  });

  test("register duplicate email → 409", async ({ request }) => {
    const res = await request.post("/api/v1/auth/register", {
      data: { email: EMAIL, password: PASSWORD, fullName: "Duplicate", role: "patient" },
    });
    expect(res.status()).toBe(409);
  });
});
