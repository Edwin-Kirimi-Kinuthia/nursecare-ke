import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { db } from "@carebora/db";
import { paymentService, signAccessToken } from "@carebora/core";

test.describe.configure({ mode: "serial" });
test.skip(process.env.PROVIDER_MEETINGS_E2E !== "1", "Requires a disposable local database");
const users: string[] = [];
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
let provider: string, patient: string, providerToken: string, patientToken: string, otherToken: string, adminToken: string;
let appointmentId: string, consultationId: string, gatewayRef: string;

test.beforeAll(async () => {
  if (!["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname)) throw Error("Local database required");
  const tokens: string[] = [];
  for (const role of ["doctor", "patient", "nurse", "admin"] as const) {
    const u = await db.user.create({ data: { fullName: `Checkout ${role}`, role, email: `${randomUUID()}@carebora.test`,
      ...(role === "doctor" || role === "nurse" ? { providerProfile: { create: { verificationStatus: "verified", isAvailable: true, consultationFeeKes: 1700 } } } : {}),
    } });
    users.push(u.id); tokens.push(await signAccessToken({ sub: u.id, role }));
  }
  [provider, patient] = users;
  [providerToken, patientToken, otherToken, adminToken] = tokens;
});
test.afterAll(async () => {
  if (!patient || !provider) return;
  await db.payment.deleteMany({ where: { patientId: patient } });
  await db.consultation.deleteMany({ where: { appointment: { providerId: provider } } });
  await db.appointment.deleteMany({ where: { providerId: provider } });
  await db.slot.deleteMany({ where: { providerId: provider } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});

test("unpaid checkout cannot place, confirm, start or waive a booking", async ({ request, page }) => {
  const startsAt = new Date(Date.now() + 14 * 86_400_000);
  const slot = await db.slot.create({ data: { providerId: provider, appointmentType: "teleconsult", startsAt, endsAt: new Date(+startsAt + 1_800_000) } });
  const created = await request.post("/api/v1/appointments", { headers: auth(patientToken), data: { slotId: slot.id, status: "confirmed", paymentWaived: true, feeKes: 0 } });
  expect(created.status()).toBe(201);
  const a = (await created.json()).data; appointmentId = a.id;
  expect(a).toMatchObject({ status: "awaiting_payment", paymentWaived: false, feeKes: 1700, payment: null });
  const list = await request.get("/api/v1/appointments", { headers: auth(providerToken) });
  expect((await list.json()).data.appointments).toEqual([]);
  expect((await request.get(`/api/v1/appointments/${a.id}`, { headers: auth(providerToken) })).status()).toBe(403);
  for (const status of ["confirmed", "completed"]) {
    expect((await request.patch(`/api/v1/appointments/${a.id}`, { headers: auth(providerToken), data: { status, paymentWaived: true } })).status()).toBe(400);
  }
  for (const [token, status] of [[providerToken, 400], [patientToken, 403], [otherToken, 403]] as const) {
    expect((await request.post(`/api/v1/appointments/${a.id}/consultation`, { headers: auth(token) })).status()).toBe(status);
  }
  expect(await db.notification.count({ where: { userId: provider } })).toBe(0);
  await page.context().addCookies([{ name: "cb_access", value: patientToken, url: test.info().project.use.baseURL! }]);
  await page.goto(`/appointments?pay=${a.id}`);
  await expect(page.getByRole("heading", { name: "Pay to place your booking" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Join consultation", exact: true })).toHaveCount(0);
});

test("pending, failed and unverified payments do not place a booking; verification does", async ({ request }) => {
  const init = await request.post("/api/v1/payments/mpesa/stk", { headers: auth(patientToken), data: { appointmentId, phoneNumber: "0712345678" } });
  expect(init.status()).toBe(202);
  const p = (await init.json()).data; gatewayRef = p.gatewayRef;
  expect((await db.appointment.findUniqueOrThrow({ where: { id: appointmentId } })).status).toBe("awaiting_payment");
  await paymentService.settle(p.gatewayRef, { success: false, failureReason: "Cancelled on handset" });
  expect((await db.appointment.findUniqueOrThrow({ where: { id: appointmentId } })).status).toBe("awaiting_payment");
  const retry = await request.post("/api/v1/payments/mpesa/stk", { headers: auth(patientToken), data: { appointmentId, phoneNumber: "0712345678" } });
  const next = (await retry.json()).data; gatewayRef = next.gatewayRef;
  expect((await request.post("/api/v1/payments/till/submit", { headers: auth(patientToken), data: { gatewayRef, code: "E2E" + randomUUID().replaceAll("-", "").slice(0,9) } })).status()).toBe(200);
  expect((await db.appointment.findUniqueOrThrow({ where: { id: appointmentId } })).status).toBe("awaiting_payment");
  expect((await request.post("/api/v1/admin/payments/verifications", { headers: auth(adminToken), data: { id: next.id, approve: true } })).status()).toBe(200);
  expect((await db.appointment.findUniqueOrThrow({ where: { id: appointmentId } })).status).toBe("confirmed");
  const list = await request.get("/api/v1/appointments", { headers: auth(providerToken) });
  expect((await list.json()).data.appointments.map((a: { id: string }) => a.id)).toEqual([appointmentId]);
  await Promise.all([paymentService.settle(gatewayRef, { success: true }), paymentService.settle(gatewayRef, { success: true })]);
  expect(await db.ledgerEntry.count({ where: { paymentId: next.id } })).toBe(3);
  await expect.poll(() => db.notification.count({ where: { userId: provider, type: "appointment_booked" } })).toBe(1);
});

test("only the assigned provider can resume the paid consultation without charging again", async ({ request }) => {
  const start = await request.post(`/api/v1/appointments/${appointmentId}/consultation`, { headers: auth(providerToken) });
  expect(start.status()).toBe(201); consultationId = (await start.json()).data.id;
  expect((await request.patch(`/api/v1/consultations/${consultationId}`, { headers: auth(providerToken), data: { status: "ended" } })).status()).toBe(200);
  for (const token of [patientToken, otherToken]) {
    expect((await request.post(`/api/v1/appointments/${appointmentId}/consultation`, { headers: auth(token) })).status()).toBe(403);
    expect((await request.patch(`/api/v1/consultations/${consultationId}`, { headers: auth(token), data: { status: "active" } })).status()).toBe(403);
  }
  expect((await request.post(`/api/v1/consultations/${consultationId}/token`, { headers: auth(patientToken), data: {} })).status()).toBe(400);
  const resumed = await request.post(`/api/v1/appointments/${appointmentId}/consultation`, { headers: auth(providerToken) });
  expect(resumed.status()).toBe(201); expect((await resumed.json()).data.id).toBe(consultationId);
  expect((await db.appointment.findUniqueOrThrow({ where: { id: appointmentId } })).paymentWaived).toBe(true);
  expect((await request.post(`/api/v1/consultations/${consultationId}/token`, { headers: auth(patientToken), data: {} })).status()).toBe(200);
  expect((await request.post("/api/v1/payments/mpesa/stk", { headers: auth(patientToken), data: { appointmentId, phoneNumber: "0712345678" } })).status()).toBe(400);
});

test("busy providers receive a booking request only after payment", async ({ request }) => {
  await db.providerProfile.update({ where: { userId: provider }, data: { isAvailable: false } });
  const startsAt = new Date(Date.now() + 16 * 86_400_000);
  const slot = await db.slot.create({ data: { providerId: provider, appointmentType: "teleconsult", startsAt, endsAt: new Date(+startsAt + 1_800_000) } });
  const checkout = await request.post("/api/v1/appointments", { headers: auth(patientToken), data: { slotId: slot.id } });
  const a = (await checkout.json()).data;
  expect(a.status).toBe("awaiting_payment");
  const p = await db.payment.create({ data: { patientId: patient, providerId: provider, subjectType: "appointment", subjectId: a.id, gateway: "till", method: "till", gatewayRef: randomUUID(), amountKes: 1700, phoneNumber: "0712345678", commissionPercentSnapshot: 15 } });
  await Promise.all([paymentService.settle(p.gatewayRef, { success: true }), paymentService.settle(p.gatewayRef, { success: true })]);
  expect((await db.appointment.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("requested");
  expect(await db.ledgerEntry.count({ where: { paymentId: p.id } })).toBe(3);
  expect((await request.patch(`/api/v1/appointments/${a.id}`, { headers: auth(providerToken), data: { status: "confirmed" } })).status()).toBe(200);
});
