import { test, expect } from "@playwright/test";

/**
 * Medical records (EMR) access control E2E — the part that matters most.
 * Every read goes through assertCanRead() and is logged to RecordAccessLog:
 * the patient always; a stranger is denied; a grantee (once granted, until
 * revoked) is allowed; an admin only with an explicit break-glass reason.
 * Uses admin@carebora.ke (seeded, password Demo1234!) for the break-glass case.
 */

const UNIQUE = Date.now();
const OWNER_EMAIL = `records-owner+${UNIQUE}@carebora.test`;
const STRANGER_EMAIL = `records-stranger+${UNIQUE}@carebora.test`;
const PASSWORD = "Test1234!";

test.describe.configure({ mode: "serial" });

let ownerToken = "";
let ownerId = "";
let strangerToken = "";
let adminToken = "";
let grantId = "";

test.describe("Medical records access control", () => {
  test("register owner patient", async ({ request }) => {
    const res = await request.post("/api/v1/auth/register", {
      data: { email: OWNER_EMAIL, password: PASSWORD, fullName: "E2E Record Owner", role: "patient" },
    });
    expect(res.status()).toBe(201);
    const { data } = await res.json();
    ownerToken = data.accessToken;
    ownerId = data.user.id;
  });

  test("register stranger patient", async ({ request }) => {
    const res = await request.post("/api/v1/auth/register", {
      data: { email: STRANGER_EMAIL, password: PASSWORD, fullName: "E2E Record Stranger", role: "patient" },
    });
    expect(res.status()).toBe(201);
    strangerToken = (await res.json()).data.accessToken;
  });

  test("login admin", async ({ request }) => {
    const res = await request.post("/api/v1/auth/login", {
      data: { email: "admin@carebora.ke", password: "Demo1234!" },
    });
    expect(res.status()).toBe(200);
    adminToken = (await res.json()).data.accessToken;
  });

  test("owner adds an allergy to their own record", async ({ request }) => {
    const res = await request.post(`/api/v1/records/${ownerId}/allergies`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: { substance: "Sulfa drugs", severity: "severe", reaction: "Anaphylaxis" },
    });
    expect(res.status()).toBe(201);
  });

  test("owner reads their own record", async ({ request }) => {
    const res = await request.get(`/api/v1/records/${ownerId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data.allergies.some((a: { substance: string }) => a.substance === "Sulfa drugs")).toBe(true);
  });

  test("stranger with no relationship or grant is DENIED", async ({ request }) => {
    const res = await request.get(`/api/v1/records/${ownerId}`, {
      headers: { Authorization: `Bearer ${strangerToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test("the denial was logged", async ({ request }) => {
    const res = await request.get(`/api/v1/records/${ownerId}/access-log`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    const denial = data.logs.find((l: { action: string; actor: { fullName: string } }) =>
      l.action === "denied" && l.actor.fullName === "E2E Record Stranger");
    expect(denial).toBeTruthy();
  });

  test("admin without a reason is refused (no silent break-glass)", async ({ request }) => {
    const res = await request.get(`/api/v1/records/${ownerId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(400);
  });

  test("admin with an explicit reason gets break-glass access, and it is logged", async ({ request }) => {
    const res = await request.get(`/api/v1/records/${ownerId}?reason=${encodeURIComponent("E2E test of break-glass access")}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);

    const logRes = await request.get(`/api/v1/records/${ownerId}/access-log`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const { data } = await logRes.json();
    const breakGlass = data.logs.find((l: { action: string }) => l.action === "break_glass");
    expect(breakGlass).toBeTruthy();
    expect(breakGlass.reason).toBe("E2E test of break-glass access");
  });

  test("owner grants the stranger standing access", async ({ request }) => {
    const res = await request.post(`/api/v1/records/${ownerId}/grants`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: { granteeEmail: STRANGER_EMAIL },
    });
    expect(res.status()).toBe(201);
    grantId = (await res.json()).data.id;
  });

  test("the grantee can now read the record, and it is logged as a view", async ({ request }) => {
    const res = await request.get(`/api/v1/records/${ownerId}`, {
      headers: { Authorization: `Bearer ${strangerToken}` },
    });
    expect(res.status()).toBe(200);

    const logRes = await request.get(`/api/v1/records/${ownerId}/access-log`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const { data } = await logRes.json();
    const grantedView = data.logs.find((l: { action: string; actor: { fullName: string } }) =>
      l.action === "view" && l.actor.fullName === "E2E Record Stranger");
    expect(grantedView).toBeTruthy();
  });

  test("owner revokes the grant", async ({ request }) => {
    const res = await request.delete(`/api/v1/records/${ownerId}/grants/${grantId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(res.status()).toBe(200);
  });

  test("after revocation the former grantee is denied again", async ({ request }) => {
    const res = await request.get(`/api/v1/records/${ownerId}`, {
      headers: { Authorization: `Bearer ${strangerToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test("GET /records/:patientId without auth → 401", async ({ request }) => {
    const res = await request.get(`/api/v1/records/${ownerId}`);
    expect(res.status()).toBe(401);
  });
});
