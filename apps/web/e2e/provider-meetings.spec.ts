import { test, expect, type APIRequestContext } from "@playwright/test";
import { db } from "@carebora/db";
import { signAccessToken } from "@carebora/core";

// Run against a local server and disposable migrated database with matching
// DATABASE_URL/JWT_SECRET. Opt in with PROVIDER_MEETINGS_E2E=1. No seed needed.
test.describe.configure({ mode: "serial" });
test.skip(process.env.PROVIDER_MEETINGS_E2E !== "1", "Requires a disposable local database and matching server credentials");

let providerId: string;
let clientId: string;
let providerToken: string;
let clientToken: string;
let otherToken: string;
let pendingToken: string;
let meetingId: string;
let consultationId: string;
const users: string[] = [];
const email = `meetings-${Date.now()}@carebora.test`;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
const schedule = (request: APIRequestContext, data: object, token = providerToken) =>
  request.post("/api/v1/appointments/provider-meeting", { headers: auth(token), data: { clientEmail: email, ...data } });
const start = (request: APIRequestContext, id: string, token = providerToken) =>
  request.post(`/api/v1/appointments/${id}/consultation`, { headers: auth(token) });

test.beforeAll(async () => {
  for (const [index, role] of ["doctor", "patient", "nurse", "doctor"].entries()) {
    const user = await db.user.create({
      data: {
        email: index === 1 ? email : `${index}-${email}`,
        fullName: ["Meeting Provider", "Meeting Client", "Other Provider", "Pending Provider"][index],
        role: role as "doctor" | "patient" | "nurse",
        ...(index !== 1 ? { providerProfile: { create: {
          verificationStatus: index === 3 ? "pending" : "verified",
          consultationFeeKes: 2500, isAvailable: false,
        } } } : {}),
      },
    });
    users.push(user.id);
  }
  [providerId, clientId] = users;
  [providerToken, clientToken, otherToken, pendingToken] = await Promise.all(users.map((sub, index) =>
    signAccessToken({ sub, role: index === 1 ? "patient" : index === 2 ? "nurse" : "doctor" }),
  ));
});

test.afterAll(async () => {
  if (!users.length) return;
  // Delete only this suite's fixtures, in foreign-key order.
  await db.consultation.deleteMany({ where: { appointment: { providerId: { in: users } } } });
  await db.appointment.deleteMany({ where: { providerId: { in: users } } });
  await db.slot.deleteMany({ where: { providerId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});

test("busy providers can invite a new client outside their published availability for free", async ({ request }) => {
  const startsAt = future(7);
  const res = await schedule(request, { startsAt, durationMinutes: 47 });
  expect(res.status()).toBe(201);
  const { data: a } = await res.json();
  meetingId = a.id;
  expect(a).toMatchObject({ providerId, patientId: clientId, status: "confirmed", feeKes: 0, paymentWaived: true, payment: null });
  expect(a.slot.startsAt).toBe(startsAt);
  expect(+new Date(a.slot.endsAt) - +new Date(a.slot.startsAt)).toBe(47 * 60_000);
  expect(await db.availability.count({ where: { providerId } })).toBe(0);
  const list = await request.get("/api/v1/appointments", { headers: auth(clientToken) });
  expect((await list.json()).data.appointments.some((item: { id: string }) => item.id === meetingId)).toBe(true);
});

test("free invitations start and join without a payment and reject payment attempts", async ({ request }) => {
  const res = await start(request, meetingId);
  expect(res.status()).toBe(201);
  consultationId = (await res.json()).data.id;
  const token = await request.post(`/api/v1/consultations/${consultationId}/token`, { headers: auth(clientToken), data: {} });
  expect(token.status()).toBe(200);
  expect((await token.json()).data.token).toBeTruthy();
  const pay = await request.post("/api/v1/payments/mpesa/stk", {
    headers: auth(clientToken), data: { appointmentId: meetingId, phoneNumber: "0712345678" },
  });
  expect(pay.status()).toBe(400);
  expect((await pay.json()).error.message).toContain("No payment is required");
  expect(await db.payment.count({ where: { subjectId: meetingId } })).toBe(0);
});

test("completed consultations reopen with their records and prescriptions intact", async ({ request }) => {
  await db.consultation.update({ where: { id: consultationId }, data: { clinicalNotes: "Original clinical note", clinicalRecord: { history: "Original history" } } });
  const prescription = await db.prescription.create({ data: { consultationId, providerId, patientId: clientId, medications: [], instructions: "Original prescription" } });
  const end = await request.patch(`/api/v1/consultations/${consultationId}`, { headers: auth(providerToken), data: { status: "ended" } });
  expect(end.status()).toBe(200);
  expect((await db.appointment.findUniqueOrThrow({ where: { id: meetingId } })).status).toBe("completed");
  const resumed = await start(request, meetingId);
  expect(resumed.status()).toBe(201);
  expect((await resumed.json()).data).toMatchObject({ id: consultationId, status: "active", endedAt: null, clinicalNotes: "Original clinical note", clinicalRecord: { history: "Original history" } });
  expect((await db.prescription.findUniqueOrThrow({ where: { id: prescription.id } })).instructions).toBe("Original prescription");
  expect((await db.appointment.findUniqueOrThrow({ where: { id: meetingId } }))).toMatchObject({ status: "confirmed", paymentWaived: true });
  const repeat = await start(request, meetingId);
  expect((await repeat.json()).data.id).toBe(consultationId);
  const chat = await request.post(`/api/v1/consultations/${consultationId}/messages`, { headers: auth(clientToken), data: { content: "I have rejoined" } });
  expect(chat.status()).toBe(201);
});

test("only the owning provider can resume, and patients cannot reopen through status updates", async ({ request }) => {
  for (const token of [clientToken, otherToken]) expect((await start(request, meetingId, token)).status()).toBe(403);
  const patch = await request.patch(`/api/v1/consultations/${consultationId}`, { headers: auth(clientToken), data: { status: "active" } });
  expect(patch.status()).toBe(403);
});

test("completed appointments without a room can resume without changing the original fee", async ({ request }) => {
  const slot = await db.slot.create({ data: { providerId, appointmentType: "teleconsult", startsAt: future(10), endsAt: future(10.1), isBooked: true } });
  const a = await db.appointment.create({ data: { providerId, patientId: clientId, slotId: slot.id, appointmentType: "teleconsult", status: "completed", feeKes: 2500 } });
  expect((await start(request, a.id)).status()).toBe(201);
  expect(await db.appointment.findUniqueOrThrow({ where: { id: a.id } })).toMatchObject({ status: "confirmed", feeKes: 2500, paymentWaived: true });
});

test("regular client bookings still require payment, and clients cannot set a waiver", async ({ request }) => {
  const slot = await db.slot.create({ data: { providerId, appointmentType: "teleconsult", startsAt: future(12), endsAt: future(12.01) } });
  const booked = await request.post("/api/v1/appointments", { headers: auth(clientToken), data: { slotId: slot.id, feeKes: 0, paymentWaived: true } });
  expect(booked.status()).toBe(201);
  const a = (await booked.json()).data;
  expect(a).toMatchObject({ feeKes: 2500, paymentWaived: false, status: "requested" });
  await request.patch(`/api/v1/appointments/${a.id}`, { headers: auth(providerToken), data: { status: "confirmed" } });
  expect((await start(request, a.id)).status()).toBe(400);
});

test("meet now uses server time and scheduling rejects invalid clients, times, roles and conflicts", async ({ request }) => {
  const now = Date.now();
  const immediate = await schedule(request, { durationMinutes: 5 });
  expect(immediate.status()).toBe(201);
  expect(+new Date((await immediate.json()).data.slot.startsAt)).toBeGreaterThanOrEqual(now);
  expect((await schedule(request, { startsAt: future(7) })).status()).toBe(409);
  const before = await db.appointment.count({ where: { providerId } });
  expect((await schedule(request, { startsAt: future(-1) })).status()).toBe(400);
  expect((await schedule(request, { startsAt: "invalid" })).status()).toBe(422);
  expect((await schedule(request, { durationMinutes: 0 })).status()).toBe(422);
  expect((await schedule(request, { clientEmail: `0-${email}` })).status()).toBe(400);
  expect((await schedule(request, { clientEmail: "missing@carebora.test" })).status()).toBe(404);
  expect((await schedule(request, {}, clientToken)).status()).toBe(403);
  expect((await schedule(request, {}, pendingToken)).status()).toBe(403);
  expect(await db.appointment.count({ where: { providerId } })).toBe(before);
});

test("provider UI schedules a later meeting and offers resume on completed consultations", async ({ page, request }) => {
  await request.patch(`/api/v1/consultations/${consultationId}`, { headers: auth(providerToken), data: { status: "ended" } });
  await page.context().addCookies([{ name: "cb_access", value: providerToken, url: test.info().project.use.baseURL! }]);
  await page.goto("/appointments");
  const completedCard = page.locator(".card-lift").filter({ has: page.getByText("Completed", { exact: true }) });
  await expect(completedCard.getByRole("button", { name: "Resume consultation", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Schedule a meeting", exact: true }).click();
  await page.getByLabel("Client email", { exact: false }).fill(email);
  await page.getByLabel("Schedule for later").check();
  const local = `${future(20).slice(0, 10)}T02:17`;
  await page.getByLabel("Date and time (East Africa Time)").fill(local);
  const saved = page.waitForResponse((res) => res.url().includes("/appointments/provider-meeting") && res.request().method() === "POST");
  await page.getByRole("button", { name: "Schedule meeting", exact: true }).click();
  expect((await saved).status()).toBe(201);
  expect((await (await saved).json()).data.slot.startsAt).toBe(new Date(`${local}:00+03:00`).toISOString());
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const resumed = page.waitForResponse((res) => res.url().includes(`/appointments/${meetingId}/consultation`) && res.request().method() === "POST");
  await completedCard.getByRole("button", { name: "Resume consultation", exact: true }).click();
  expect((await resumed).status()).toBe(201);
});

test("overlapping published slots cannot be booked over a provider meeting", async ({ request }) => {
  const meeting = await db.appointment.findUniqueOrThrow({ where: { id: meetingId }, include: { slot: true } });
  const slot = await db.slot.create({ data: {
    providerId, appointmentType: "teleconsult",
    startsAt: new Date(+meeting.slot.startsAt + 5 * 60_000),
    endsAt: new Date(+meeting.slot.endsAt + 5 * 60_000),
  } });
  const book = await request.post("/api/v1/appointments", { headers: auth(clientToken), data: { slotId: slot.id } });
  expect(book.status()).toBe(409);
  const open = await request.get(`/api/v1/providers/${providerId}/slots?from=${meeting.slot.startsAt.toISOString()}&to=${slot.endsAt.toISOString()}`);
  expect(open.status()).toBe(200);
  expect((await open.json()).data.some((item: { id: string }) => item.id === slot.id)).toBe(false);
});

test("simultaneous provider requests create only one meeting at the same time", async ({ request }) => {
  const startsAt = future(22);
  const responses = await Promise.all([schedule(request, { startsAt }), schedule(request, { startsAt })]);
  expect(responses.map((r) => r.status()).sort()).toEqual([201, 409]);
  expect(await db.appointment.count({ where: { providerId, slot: { startsAt: new Date(startsAt) } } })).toBe(1);
});

test("client UI shows free and resumed meetings without a Pay action", async ({ page }) => {
  // The ordinary paid booking remains payable, while invitation cards do not.
  await page.context().addCookies([{ name: "cb_access", value: clientToken, url: test.info().project.use.baseURL! }]);
  await page.goto("/appointments");
  await expect(page.getByText("No payment required", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Pay KES/ })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Join consultation", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Schedule a meeting", exact: true })).toHaveCount(0);
});
