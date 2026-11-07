import { randomUUID } from "node:crypto";
import { PrismaClient, type UserRole } from "@prisma/client";
import { test, expect } from "@playwright/test";
import { hashRefreshToken, signAccessToken } from "../../../packages/core/src/auth/tokens";
import { hashPassword } from "../../../packages/core/src/auth/password";

// Opt in with a separate, migrated database and set DATABASE_URL to the same
// value for the test server. These tests create their own identities and
// appointments; they never need seeded or real user accounts.
const databaseUrl = process.env.ACCOUNT_LIFECYCLE_TEST_DATABASE_URL;
const db = new PrismaClient({ datasourceUrl: databaseUrl });
const PASSWORD = "Lifecycle123!";
const passwordHash = hashPassword(PASSWORD);
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

test.use({
  actionTimeout: 30_000,
  screenshot: "only-on-failure",
  trace: "retain-on-failure",
  launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : {},
});

async function createUser(role: UserRole, withPassword = true) {
  const suffix = randomUUID();
  return db.user.create({
    data: {
      role,
      email: `lifecycle-${suffix}@carebora.test`,
      fullName: `Lifecycle ${role} ${suffix}`,
      ...(withPassword ? { credentials: { create: { passwordHash } } } : {}),
      ...(role === "patient" ? { patientProfile: { create: {} } } : {}),
      ...(role === "doctor" ? {
        providerProfile: {
          create: {
            verificationStatus: "verified",
            specialty: `Lifecycle ${suffix}`,
            consultationFeeKes: 500,
            isAvailable: true,
            bio: "A provider account created only for the account lifecycle tests.",
          },
        },
      } : {}),
    },
    include: { providerProfile: true },
  });
}

async function createFixture() {
  const admin = await createUser("admin");
  const patient = await createUser("patient");
  const provider = await createUser("doctor");
  const rule = await db.availability.create({
    data: { providerId: provider.id, appointmentType: "teleconsult", dayOfWeek: 1, startMinute: 480, endMinute: 1080 },
  });
  // Beyond the top-up threshold so listing slots does not generate a whole calendar.
  const startsAt = new Date(Date.now() + 30 * 86_400_000);
  const slot = await db.slot.create({
    data: {
      providerId: provider.id, availabilityId: rule.id, appointmentType: "teleconsult",
      startsAt, endsAt: new Date(startsAt.getTime() + 30 * 60_000),
    },
  });
  const tokens = {
    admin: await signAccessToken({ sub: admin.id, role: "admin" }),
    patient: await signAccessToken({ sub: patient.id, role: "patient" }),
    provider: await signAccessToken({ sub: provider.id, role: "doctor" }),
  };
  for (const user of [admin, patient, provider]) {
    await db.session.create({
      data: { userId: user.id, refreshTokenHash: randomUUID(), expiresAt: new Date(Date.now() + 86_400_000) },
    });
  }
  return { admin, patient, provider, rule, slot, tokens };
}

test.describe("Account lifecycle", () => {
  test.skip(!databaseUrl, "Set ACCOUNT_LIFECYCLE_TEST_DATABASE_URL to an isolated test database.");
  test.describe.configure({ mode: "default", timeout: 120_000 });

  test.afterAll(async () => { await db.$disconnect(); });

  test("disabled providers disappear from listings, specialties, profiles, and booking", async ({ request }) => {
    const f = await createFixture();
    const query = `specialty=${encodeURIComponent(f.provider.providerProfile!.specialty!)}`;
    const before = await request.get(`/api/v1/providers?${query}`);
    expect((await before.json()).data.total).toBe(1);
    // Warm the server-rendered page before changing account state.
    expect((await request.get("/providers")).status()).toBe(200);

    const disabled = await request.patch(`/api/v1/admin/users/${f.provider.id}`, {
      headers: bearer(f.tokens.admin), data: { isActive: false },
    });
    expect(disabled.status()).toBe(200);
    for (const filters of [query, `${query}&verified=false`, `${query}&available=true`]) {
      const res = await request.get(`/api/v1/providers?${filters}`);
      expect((await res.json()).data).toMatchObject({ providers: [], total: 0 });
    }
    const specialties = (await (await request.get("/api/v1/providers/specialties")).json()).data.specialties;
    expect(specialties.map((s: { name: string }) => s.name)).not.toContain(f.provider.providerProfile!.specialty);
    for (const path of ["", "/slots", "/avatar"]) {
      expect((await request.get(`/api/v1/providers/${f.provider.id}${path}`)).status()).toBe(404);
    }
    const booking = await request.post("/api/v1/appointments", {
      headers: bearer(f.tokens.patient), data: { slotId: f.slot.id },
    });
    expect(booking.status()).toBe(404);
    const oldSession = await request.get("/api/v1/auth/me", { headers: bearer(f.tokens.provider) });
    expect(oldSession.status()).toBe(401);
    expect(await db.session.count({ where: { userId: f.provider.id } })).toBe(0);
    expect(await (await request.get("/providers")).text()).not.toContain(f.provider.fullName);

    const enabled = await request.patch(`/api/v1/admin/users/${f.provider.id}`, {
      headers: bearer(f.tokens.admin), data: { isActive: true },
    });
    expect(enabled.status()).toBe(200);
    expect((await (await request.get(`/api/v1/providers?${query}`)).json()).data.total).toBe(1);
    expect((await request.get(`/api/v1/providers/${f.provider.id}/slots`)).status()).toBe(200);
  });

  test("admin deletion closes a provider account and preserves appointment and payment history", async ({ request }) => {
    const f = await createFixture();
    const upcoming = await db.appointment.create({
      data: { patientId: f.patient.id, providerId: f.provider.id, slotId: f.slot.id, appointmentType: "teleconsult", status: "confirmed", feeKes: 500 },
    });
    await db.slot.update({ where: { id: f.slot.id }, data: { isBooked: true } });
    const pastStart = new Date(Date.now() - 2 * 86_400_000);
    const pastSlot = await db.slot.create({
      data: {
        providerId: f.provider.id, appointmentType: "teleconsult", isBooked: true,
        startsAt: pastStart, endsAt: new Date(pastStart.getTime() + 30 * 60_000),
      },
    });
    const completed = await db.appointment.create({
      data: { patientId: f.patient.id, providerId: f.provider.id, slotId: pastSlot.id, appointmentType: "teleconsult", status: "completed", feeKes: 500 },
    });
    const payment = await db.payment.create({
      data: {
        subjectType: "appointment", subjectId: completed.id, patientId: f.patient.id, providerId: f.provider.id,
        amountKes: 500, phoneNumber: "254700000000", gatewayRef: randomUUID(), commissionPercentSnapshot: 10, status: "completed",
      },
    });
    // It must also be possible to delete an account that is already disabled.
    await db.user.update({ where: { id: f.provider.id }, data: { isActive: false } });
    const res = await request.delete(`/api/v1/admin/users/${f.provider.id}`, {
      headers: bearer(f.tokens.admin), data: { confirm: "DELETE" },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).data).toEqual({ deleted: true, appointmentsCancelled: 1 });

    const deleted = await db.user.findUniqueOrThrow({ where: { id: f.provider.id }, include: { credentials: true, providerProfile: true } });
    expect(deleted).toMatchObject({ isActive: false, fullName: "Deleted user", phone: null, avatarUrl: null, credentials: null });
    expect(deleted.deletedAt).not.toBeNull();
    expect(deleted.email).toBe(`deleted-${f.provider.id}@deleted.invalid`);
    expect(deleted.providerProfile).toMatchObject({ isAvailable: false, verificationStatus: "unverified" });
    expect((await db.appointment.findUniqueOrThrow({ where: { id: upcoming.id } })).status).toBe("cancelled");
    expect((await db.appointment.findUniqueOrThrow({ where: { id: completed.id } })).status).toBe("completed");
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("completed");
    expect((await db.slot.findUniqueOrThrow({ where: { id: f.slot.id } })).isBooked).toBe(true);
    expect((await db.availability.findUniqueOrThrow({ where: { id: f.rule.id } })).isActive).toBe(false);
    expect(await db.session.count({ where: { userId: f.provider.id } })).toBe(0);
    expect(await db.auditLog.count({ where: { action: "admin_delete_user", actorId: f.admin.id, entityId: f.provider.id } })).toBe(1);

    const publicList = (await (await request.get(`/api/v1/providers?verified=false&specialty=${encodeURIComponent(f.provider.providerProfile!.specialty!)}`)).json()).data;
    expect(publicList).toMatchObject({ total: 0, providers: [] });
    const users = (await (await request.get(`/api/v1/admin/users?search=${f.provider.id}`, { headers: bearer(f.tokens.admin) })).json()).data;
    expect(users.total).toBe(0);
    const verifications = (await (await request.get(`/api/v1/admin/verifications?specialty=${encodeURIComponent(f.provider.providerProfile!.specialty!)}`, { headers: bearer(f.tokens.admin) })).json()).data;
    expect(verifications.total).toBe(0);
    const reactivate = await request.patch(`/api/v1/admin/users/${f.provider.id}`, {
      headers: bearer(f.tokens.admin), data: { isActive: true },
    });
    expect(reactivate.status()).toBe(404);
    expect((await request.get("/api/v1/auth/me", { headers: bearer(f.tokens.provider) })).status()).toBe(401);
  });

  test("admin deletion of a patient frees their upcoming slot without deleting care records", async ({ request }) => {
    const f = await createFixture();
    const appointment = await db.appointment.create({
      data: { patientId: f.patient.id, providerId: f.provider.id, slotId: f.slot.id, appointmentType: "teleconsult", status: "requested", feeKes: 500 },
    });
    await db.slot.update({ where: { id: f.slot.id }, data: { isBooked: true } });
    const res = await request.delete(`/api/v1/admin/users/${f.patient.id}`, { headers: bearer(f.tokens.admin), data: { confirm: "DELETE" } });
    expect(res.status()).toBe(200);
    expect((await db.appointment.findUniqueOrThrow({ where: { id: appointment.id } })).status).toBe("cancelled");
    expect((await db.slot.findUniqueOrThrow({ where: { id: f.slot.id } })).isBooked).toBe(false);
    expect(await db.patientProfile.findUnique({ where: { userId: f.patient.id } })).toBeNull();
    expect((await db.user.findUniqueOrThrow({ where: { id: f.provider.id } })).isActive).toBe(true);
  });

  test("admin deletion requires a current administrator and explicit confirmation", async ({ request }) => {
    const f = await createFixture();
    const path = `/api/v1/admin/users/${f.provider.id}`;
    expect((await request.delete(path, { data: { confirm: "DELETE" } })).status()).toBe(401);
    expect((await request.delete(path, { headers: bearer(f.tokens.patient), data: { confirm: "DELETE" } })).status()).toBe(403);
    // A stale token carrying an old admin role must not grant admin access.
    const staleRole = await signAccessToken({ sub: f.patient.id, role: "admin" });
    expect((await request.delete(path, { headers: bearer(staleRole), data: { confirm: "DELETE" } })).status()).toBe(403);
    expect((await request.delete(path, { headers: bearer(f.tokens.admin), data: { confirm: "delete" } })).status()).toBe(422);
    expect((await request.delete(`/api/v1/admin/users/${f.admin.id}`, { headers: bearer(f.tokens.admin), data: { confirm: "DELETE" } })).status()).toBe(403);
    expect((await db.user.findUniqueOrThrow({ where: { id: f.provider.id } })).deletedAt).toBeNull();
    await db.user.update({ where: { id: f.admin.id }, data: { isActive: false } });
    expect((await request.delete(path, { headers: bearer(f.tokens.admin), data: { confirm: "DELETE" } })).status()).toBe(401);
  });

  test("another administrator can delete an administrator account", async ({ request }) => {
    const f = await createFixture();
    const otherAdmin = await createUser("admin");
    const res = await request.delete(`/api/v1/admin/users/${otherAdmin.id}`, { headers: bearer(f.tokens.admin), data: { confirm: "DELETE" } });
    expect(res.status()).toBe(200);
    expect((await db.user.findUniqueOrThrow({ where: { id: otherAdmin.id } })).deletedAt).not.toBeNull();
    expect((await request.get("/api/v1/admin/users", { headers: bearer(f.tokens.admin) })).status()).toBe(200);
  });

  test("self deletion verifies the password and blocks all existing access and refresh tokens", async ({ request }) => {
    const f = await createFixture();
    const headers = bearer(f.tokens.patient);
    const path = "/api/v1/auth/delete-account";
    const refreshToken = `lifecycle-refresh-${randomUUID()}`;
    await db.session.create({ data: { userId: f.patient.id, refreshTokenHash: hashRefreshToken(refreshToken), expiresAt: new Date(Date.now() + 86_400_000) } });
    expect((await request.post(path, { headers, data: { confirm: "DELETE", password: "wrong-password" } })).status()).toBe(401);
    expect((await db.user.findUniqueOrThrow({ where: { id: f.patient.id } })).deletedAt).toBeNull();
    const res = await request.post(path, { headers, data: { confirm: "DELETE", password: PASSWORD } });
    expect(res.status()).toBe(200);
    expect(res.headers()["set-cookie"]).toContain("cb_access=");
    expect((await request.get("/api/v1/auth/me", { headers })).status()).toBe(401);
    expect((await request.post("/api/v1/auth/refresh", { data: { refreshToken } })).status()).toBe(401);
    expect(await db.session.count({ where: { userId: f.patient.id } })).toBe(0);
  });

  test("a social-only user can delete their own account without a password", async ({ request }) => {
    const user = await createUser("patient", false);
    await db.oAuthAccount.create({ data: { userId: user.id, provider: "google", providerAccountId: randomUUID(), email: user.email } });
    const token = await signAccessToken({ sub: user.id, role: "patient" });
    const res = await request.post("/api/v1/auth/delete-account", { headers: bearer(token), data: { confirm: "DELETE" } });
    expect(res.status()).toBe(200);
    expect(await db.oAuthAccount.count({ where: { userId: user.id } })).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).deletedAt).not.toBeNull();
  });

  test("an active business must be transferred or closed before its owner is deleted", async ({ request }) => {
    const f = await createFixture();
    await db.organization.create({
      data: { type: "pharmacy", name: "Lifecycle test pharmacy", slug: `lifecycle-${randomUUID()}`, status: "approved", members: { create: { userId: f.patient.id, role: "owner" } } },
    });
    const adminRes = await request.delete(`/api/v1/admin/users/${f.patient.id}`, { headers: bearer(f.tokens.admin), data: { confirm: "DELETE" } });
    expect(adminRes.status()).toBe(409);
    const selfRes = await request.post("/api/v1/auth/delete-account", { headers: bearer(f.tokens.patient), data: { confirm: "DELETE", password: PASSWORD } });
    expect(selfRes.status()).toBe(409);
    expect((await db.user.findUniqueOrThrow({ where: { id: f.patient.id } })).deletedAt).toBeNull();
    expect(await db.credentials.count({ where: { userId: f.patient.id } })).toBe(1);
  });

  test("admin row deletion can be cancelled and requires typing DELETE", async ({ page, baseURL }) => {
    const f = await createFixture();
    page.on("pageerror", (error) => console.error("Admin page error:", error.message));
    await page.context().addCookies([{ name: "cb_access", value: f.tokens.admin, url: baseURL! }]);
    expect((await page.request.get("/api/v1/auth/me")).status()).toBe(200);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Operations dashboard" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Users", exact: true }).click();
    const row = page.getByRole("row").filter({ hasText: f.provider.email });
    await row.getByRole("button", { name: `Delete account for ${f.provider.fullName}` }).click();
    const dialog = page.getByRole("dialog", { name: "Delete user account" });
    await expect(dialog.getByRole("button", { name: "Delete permanently" })).toBeDisabled();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    expect((await db.user.findUniqueOrThrow({ where: { id: f.provider.id } })).deletedAt).toBeNull();
    await row.getByRole("button", { name: `Delete account for ${f.provider.fullName}` }).click();
    await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
    await dialog.getByRole("button", { name: "Delete permanently" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(row).toHaveCount(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: f.provider.id } })).deletedAt).not.toBeNull();
  });

  test("users can reach Settings and delete a provider account there", async ({ page, baseURL }) => {
    const f = await createFixture();
    page.on("pageerror", (error) => console.error("Settings page error:", error.message));
    await page.context().addCookies([{ name: "cb_access", value: f.tokens.provider, url: baseURL! }]);
    expect((await page.request.get("/api/v1/auth/me")).status()).toBe(200);
    await page.goto("/profile");
    await page.getByRole("link", { name: "Account settings", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Account settings", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Delete my account…", exact: true }).click();
    await page.getByLabel("Your password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await page.getByRole("button", { name: "Delete permanently", exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}/`);
    await expect(page.getByRole("link", { name: "Log in", exact: true })).toBeVisible();
    expect((await db.user.findUniqueOrThrow({ where: { id: f.provider.id } })).deletedAt).not.toBeNull();
  });
});
