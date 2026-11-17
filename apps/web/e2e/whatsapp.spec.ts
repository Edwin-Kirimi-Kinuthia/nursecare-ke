import { createHash, createHmac, randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { AccessToken } from "livekit-server-sdk";
import { test, expect } from "@playwright/test";
import { db } from "@carebora/db";
import { signAccessToken } from "@carebora/core";
import { whatsAppEvents, whatsAppService } from "../../../packages/core/src/notifications/whatsapp.service";

test.describe.configure({ mode: "serial" });
test.skip(process.env.WHATSAPP_E2E !== "1", "Requires a local disposable database and WhatsApp test configuration");
const users: string[] = [];
const references: string[] = [];
const phone = "+254700000031";
const email = `whatsapp-${randomUUID()}@carebora.test`;
const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
let clientId: string, clientToken: string, providerId: string, providerToken: string, adminToken: string, otherToken: string;
let consultationId: string;
let mediaServer: Server | undefined;
let connected = false;
const preferencePath = "/api/v1/notifications/whatsapp/preferences";
const webhookPath = "/api/v1/notifications/whatsapp/webhook";

function metaPayload(value: object) {
  return { object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID }, ...value } }] }] };
}
function signed(payload: unknown) {
  const data = JSON.stringify(payload);
  return { data, headers: { "Content-Type": "application/json", "x-hub-signature-256": `sha256=${createHmac("sha256", process.env.WHATSAPP_APP_SECRET!).update(data).digest("hex")}` } };
}
const row = (event: string) => db.whatsAppMessage.findFirst({ where: { eventKey: { startsWith: event } } });

test.beforeAll(async () => {
  const database = new URL(process.env.DATABASE_URL!);
  if (!["127.0.0.1", "localhost"].includes(database.hostname)) throw new Error("WhatsApp fixtures require a local database");
  for (const role of ["admin", "doctor", "patient"] as const) {
    const u = await db.user.create({ data: {
      role, fullName: `WhatsApp ${role}`, email: `${role}-${email}`,
      ...(role === "doctor" ? { providerProfile: { create: { verificationStatus: "verified", consultationFeeKes: 1700, isAvailable: false } } } : {}),
    } });
    users.push(u.id);
  }
  providerId = users[1];
  [adminToken, providerToken, otherToken] = await Promise.all(users.map((sub, i) => signAccessToken({ sub, role: i === 0 ? "admin" : i === 1 ? "doctor" : "patient" })));
  mediaServer = createServer(async (req, res) => {
    let input = ""; for await (const chunk of req) input += chunk;
    const body = JSON.parse(input);
    res.setHeader("Content-Type", "application/json");
    if (req.url !== "/twirp/livekit.RoomService/GetParticipant" || !connected || body.identity !== providerId) {
      res.writeHead(404); res.end(JSON.stringify({ code: "not_found", msg: "participant not connected" })); return;
    }
    res.end(JSON.stringify({ sid: "PA_test", identity: providerId, state: "ACTIVE" }));
  });
  const livekit = new URL(process.env.LIVEKIT_URL!);
  if (!["127.0.0.1", "localhost"].includes(livekit.hostname)) throw new Error("LiveKit mock must be local");
  await new Promise<void>((resolve, reject) => { mediaServer!.once("error", reject); mediaServer!.listen(Number(livekit.port), "127.0.0.1", resolve); });
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => mediaServer ? mediaServer.close(() => resolve()) : resolve());
  const ids = [...users, ...references];
  await db.whatsAppMessage.deleteMany({ where: { OR: ids.map((id) => ({ eventKey: { contains: id } })) } });
  await db.whatsAppOptOut.deleteMany({ where: { phoneNumber: phone } });
  await db.consultation.deleteMany({ where: { appointment: { providerId } } });
  await db.appointment.deleteMany({ where: { providerId } });
  await db.slot.deleteMany({ where: { providerId } });
  await db.supportTicket.deleteMany({ where: { contactEmail: email } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});

test("registration succeeds during a sender outage, alerts admin and leaves client consent off", async ({ request }) => {
  const res = await request.post("/api/v1/auth/register", { data: { email, fullName: "WhatsApp Client", password: "Cedar!River293", phone, role: "patient" } });
  expect(res.status()).toBe(201);
  const data = (await res.json()).data;
  clientId = data.user.id; clientToken = data.accessToken; users.push(clientId);
  await expect.poll(async () => (await row(`registered:${clientId}`))?.status).toBe("failed");
  expect(await row(`registered:${clientId}`)).toMatchObject({ templateKey: "admin_activity", errorCode: "configuration_missing" });
  const pref = await request.get(preferencePath, { headers: headers(clientToken) });
  expect((await pref.json()).data).toMatchObject({ enabled: false, phoneNumber: phone, deliveryAvailable: false });
  expect((await request.get(preferencePath, { headers: { Cookie: "" } })).status()).toBe(401);
  expect((await request.get("/api/v1/admin/whatsapp", { headers: headers(clientToken) })).status()).toBe(403);
});

test("preferences normalize Kenyan numbers and cannot modify another account", async ({ request }) => {
  expect((await request.patch(preferencePath, { headers: headers(clientToken), data: { enabled: true, phoneNumber: "NaN" } })).status()).toBe(422);
  const saved = await request.patch(preferencePath, { headers: headers(clientToken), data: { enabled: true, phoneNumber: "0700 000 031", userId: users[2] } });
  expect(saved.status()).toBe(200);
  expect((await saved.json()).data).toMatchObject({ enabled: true, phoneNumber: phone });
  expect(await db.whatsAppPreference.findUnique({ where: { userId: users[2] } })).toBeNull();
  expect((await db.whatsAppPreference.findUniqueOrThrow({ where: { userId: clientId } })).consentedAt).not.toBeNull();
});

test("booking alerts admin, and only confirmation alerts the opted-in client", async ({ request }) => {
  const startsAt = new Date(Date.now() + 5 * 86_400_000);
  const slot = await db.slot.create({ data: { providerId, appointmentType: "teleconsult", startsAt, endsAt: new Date(+startsAt + 30 * 60_000) } });
  const booking = await request.post("/api/v1/appointments", { headers: headers(clientToken), data: { slotId: slot.id } });
  expect(booking.status()).toBe(201);
  const a = (await booking.json()).data; references.push(a.id);
  expect(a.status).toBe("requested");
  await expect.poll(async () => !!await row(`booked:${a.id}`)).toBe(true);
  expect(await row(`confirmed:${a.id}`)).toBeNull();
  for (let i = 0; i < 2; i++) expect((await request.patch(`/api/v1/appointments/${a.id}`, { headers: headers(providerToken), data: { status: "confirmed" } })).status()).toBe(200);
  await expect.poll(async () => (await row(`confirmed:${a.id}`))?.status).toBe("failed");
  const confirmations = await db.whatsAppMessage.findMany({ where: { eventKey: { startsWith: `confirmed:${a.id}` } } });
  expect(confirmations).toHaveLength(1);
  expect(JSON.stringify(confirmations[0].parameters)).toContain("Pay KES 1,700");
  expect((await request.post(`/api/v1/appointments/${a.id}/consultation`, { headers: headers(providerToken) })).status()).toBe(400);
});

test("provider invitations are free, and unconnected or unauthorized callers cannot send join alerts", async ({ request }) => {
  const scheduled = await request.post("/api/v1/appointments/provider-meeting", { headers: headers(providerToken), data: { clientEmail: email, durationMinutes: 15 } });
  expect(scheduled.status()).toBe(201);
  const a = (await scheduled.json()).data; references.push(a.id);
  await expect.poll(async () => !!await row(`invited:${a.id}`)).toBe(true);
  expect(a.paymentWaived).toBe(true);
  const started = await request.post(`/api/v1/appointments/${a.id}/consultation`, { headers: headers(providerToken) });
  expect(started.status()).toBe(201);
  consultationId = (await started.json()).data.id; references.push(consultationId);
  const path = `/api/v1/consultations/${consultationId}/provider-connected`;
  for (const token of [clientToken, otherToken]) expect((await request.post(path, { headers: headers(token) })).status()).toBe(403);
  expect((await (await request.post(path, { headers: headers(providerToken) })).json()).data.notified).toBe(false);
  expect(await row(`ready:${consultationId}`)).toBeNull();
});

test("verified provider presence alerts once across callbacks and again after a resumed session", async ({ request }) => {
  connected = true;
  const path = `/api/v1/consultations/${consultationId}/provider-connected`;
  const results = await Promise.all([request.post(path, { headers: headers(providerToken) }), request.post(path, { headers: headers(providerToken) })]);
  expect(results.map((r) => r.status())).toEqual([200, 200]);
  const c = await db.consultation.findUniqueOrThrow({ where: { id: consultationId } });
  const payload = JSON.stringify({ event: "participant_joined", room: { name: c.roomName }, participant: { identity: providerId } });
  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
  token.sha256 = createHash("sha256").update(payload).digest("base64");
  expect((await request.post("/api/v1/consultations/livekit-webhook", { data: payload, headers: { Authorization: await token.toJwt() } })).status()).toBe(200);
  expect(await db.whatsAppMessage.count({ where: { eventKey: { startsWith: `ready:${consultationId}:1:` } } })).toBe(1);
  expect((await request.post("/api/v1/consultations/livekit-webhook", { data: payload, headers: { Authorization: "forged" } })).status()).toBe(401);
  await request.patch(`/api/v1/consultations/${consultationId}`, { headers: headers(providerToken), data: { status: "ended" } });
  expect((await (await request.post(path, { headers: headers(providerToken) })).json()).data.notified).toBe(false);
  // A failed alert from the previous run must not be sent after the call ends.
  const old = await row(`ready:${consultationId}:1:`);
  await db.whatsAppMessage.update({ where: { id: old!.id }, data: { status: "pending", availableAt: new Date() } });
  const tokenBefore = process.env.WHATSAPP_ACCESS_TOKEN;
  const fetchBefore = globalThis.fetch;
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token-not-used-for-stale-alert";
  globalThis.fetch = (async () => { throw new Error("stale alerts must not reach the gateway"); }) as typeof fetch;
  try { await whatsAppService.processQueue(); }
  finally { globalThis.fetch = fetchBefore; if (tokenBefore === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN; else process.env.WHATSAPP_ACCESS_TOKEN = tokenBefore; }
  expect((await db.whatsAppMessage.findUniqueOrThrow({ where: { id: old!.id } })).status).toBe("cancelled");
  await request.post(`/api/v1/appointments/${c.appointmentId}/consultation`, { headers: headers(providerToken) });
  await request.post(path, { headers: headers(providerToken) });
  expect(await db.whatsAppMessage.count({ where: { eventKey: { startsWith: `ready:${consultationId}:2:` } } })).toBe(1);
});

test("website enquiries and client replies alert admin without copying sensitive message text", async ({ request }) => {
  const data = { category: "general_enquiry", subject: "Private enquiry", message: "PRIVATE CONTENT about a personal medical concern", contactName: "Contact Client", contactEmail: email };
  const visitor = await request.post("/api/v1/support/tickets", { data });
  expect(visitor.status()).toBe(201);
  const visitorId = (await visitor.json()).data.id; references.push(visitorId);
  await expect.poll(async () => !!await row(`contact:${visitorId}`)).toBe(true);
  expect(JSON.stringify((await row(`contact:${visitorId}`))?.parameters)).not.toContain("PRIVATE");
  const thread = await request.post("/api/v1/support/tickets", { headers: headers(clientToken), data });
  const ticketId = (await thread.json()).data.id; references.push(ticketId);
  const reply = await request.post(`/api/v1/support/tickets/${ticketId}/reply`, { headers: headers(clientToken), data: { body: "A private follow-up" } });
  const messageId = (await reply.json()).data.id; references.push(messageId);
  await expect.poll(async () => !!await row(`contact:${messageId}`)).toBe(true);
  const staffReply = await request.post(`/api/v1/support/tickets/${ticketId}/reply`, { headers: headers(adminToken), data: { body: "Your private reply is ready" } });
  const staffMessageId = (await staffReply.json()).data.id; references.push(staffMessageId);
  await expect.poll(async () => !!await row(`support-reply:${staffMessageId}`)).toBe(true);
});

test("signed delivery receipts cannot regress read status or change another recipient's message", async ({ request }) => {
  const message = await row(`registered:${clientId}`);
  await db.whatsAppMessage.update({ where: { id: message!.id }, data: { status: "accepted", providerMessageId: `wamid.${message!.id}` } });
  const status = (state: string, recipient = message!.toPhone.slice(1)) => metaPayload({ statuses: [{ id: `wamid.${message!.id}`, recipient_id: recipient, status: state }] });
  expect((await request.post(webhookPath, { data: status("read") })).status()).toBe(401);
  expect((await request.post(webhookPath, signed(status("read", "254799999999")))).status()).toBe(200);
  expect((await db.whatsAppMessage.findUniqueOrThrow({ where: { id: message!.id } })).status).toBe("accepted");
  for (const state of ["read", "delivered", "sent", "failed"]) expect((await request.post(webhookPath, signed(status(state)))).status()).toBe(200);
  expect((await db.whatsAppMessage.findUniqueOrThrow({ where: { id: message!.id } })).status).toBe("read");
  expect((await request.get(`${webhookPath}?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123`)).status()).toBe(403);
  const challenge = await request.get(`${webhookPath}?hub.mode=subscribe&hub.verify_token=${process.env.WHATSAPP_VERIFY_TOKEN}&hub.challenge=123`);
  expect(challenge.status()).toBe(200); expect(await challenge.text()).toBe("123");
});

test("STOP cancels pending alerts and requires START plus fresh account consent", async ({ request }) => {
  const pending = await db.whatsAppMessage.create({ data: { eventKey: `queued:${clientId}`, recipientUserId: clientId, toPhone: phone, templateKey: "support_reply", parameters: ["https://app.carebora.co.ke/contact"], expiresAt: new Date(Date.now() + 60_000) } });
  const command = (body: string) => signed(metaPayload({ messages: [{ from: phone.slice(1), type: "text", text: { body } }] }));
  expect((await request.post(webhookPath, command("STOP"))).status()).toBe(200);
  expect((await db.whatsAppMessage.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe("cancelled");
  expect((await request.patch(preferencePath, { headers: headers(clientToken), data: { enabled: true } })).status()).toBe(400);
  expect((await request.post(webhookPath, command("START"))).status()).toBe(200);
  expect((await db.whatsAppPreference.findUniqueOrThrow({ where: { userId: clientId } })).enabled).toBe(false);
  expect((await request.patch(preferencePath, { headers: headers(clientToken), data: { enabled: true } })).status()).toBe(200);
  expect((await request.get("/api/v1/notifications/whatsapp/process")).status()).toBe(401);
});

test("concurrent outbox dispatch accepts one message and keeps ambiguous sends from automatic retry", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.WHATSAPP_ACCESS_TOKEN;
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token-never-sent";
  let sends = 0;
  globalThis.fetch = (async () => { sends++; return Response.json({ messages: [{ id: `wamid.test-${sends}` }] }); }) as typeof fetch;
  try {
    await db.consultation.update({ where: { id: consultationId }, data: { meetingRun: 100 } });
    const c = { id: consultationId, meetingRun: 100, appointment: { patientId: clientId } };
    await Promise.all([whatsAppEvents.ready(c), whatsAppEvents.ready(c)]);
    expect(sends).toBe(1);
    expect((await row(`ready:${consultationId}:100:`))?.status).toBe("accepted");
    globalThis.fetch = (async () => { sends++; throw new Error("timeout after possible acceptance"); }) as typeof fetch;
    await db.consultation.update({ where: { id: consultationId }, data: { meetingRun: 101 } });
    await whatsAppEvents.ready({ ...c, meetingRun: 101 });
    expect((await row(`ready:${consultationId}:101:`))?.status).toBe("unknown");
    const count = sends;
    // Process only this suite's future-dated queue; unknown sends are never selected.
    await db.whatsAppMessage.updateMany({ where: { recipientUserId: clientId, status: "pending" }, data: { availableAt: new Date(Date.now() + 60_000) } });
    await whatsAppService.processQueue();
    expect(sends).toBe(count);
  } finally { globalThis.fetch = originalFetch; if (originalToken === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN; else process.env.WHATSAPP_ACCESS_TOKEN = originalToken; }
});

test("account settings save consent and the admin panel clearly shows inactive delivery", async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  await context.addCookies([{ name: "cb_access", value: clientToken, url: baseURL! }]);
  const page = await context.newPage(); await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "WhatsApp notifications" })).toBeVisible();
  await expect(page.getByText("WhatsApp delivery is being set up.", { exact: false })).toBeVisible();
  await page.getByRole("checkbox", { name: "I agree to receive CareBora" }).uncheck();
  await page.getByRole("button", { name: "Save WhatsApp settings" }).click();
  await expect(page.getByRole("status")).toContainText("turned off");
  await context.addCookies([{ name: "cb_access", value: adminToken, url: baseURL! }]);
  await page.goto("/admin"); await page.getByRole("button", { name: "WhatsApp", exact: true }).click();
  await expect(page.getByText("WhatsApp delivery is not active", { exact: true })).toBeVisible();
  await context.close();
});
