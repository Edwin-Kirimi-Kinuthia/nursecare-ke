import { createHash, randomUUID } from "node:crypto";
import { test, expect, type APIRequestContext } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { db } from "@carebora/db";
import { signAccessToken } from "@carebora/core";
import { payAppointment } from "./support/payments";
import { authorizeDocumentSignature } from "./support/document-signature";

test.describe.configure({ mode: "serial" });
test.skip(process.env.PROVIDER_MEETINGS_E2E !== "1", "Requires an explicitly enabled disposable test database");
let adminToken: string;
let providerToken: string;
let patientToken: string;
let strangerToken: string;
let providerId: string;
let consultationId: string;
let appointmentId: string;
let certificateId: string;
let image: string;
const ids: string[] = [];
const email = `clinical-${randomUUID()}@carebora.test`;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const body = () => ({ fromDate: "2026-11-17", throughDate: "2026-11-19", signatureDataUrl: image, confirm: true });
const issue = (request: APIRequestContext, token = providerToken, data = body()) => request.post(`/api/v1/consultations/${consultationId}/sick-offs`, { headers: auth(token), data });

test.beforeAll(async ({ browser }) => {
  for (const role of ["admin", "patient", "doctor"] as const) {
    const user = await db.user.create({ data: { role, fullName: `Clinical ${role}`, email: `${role}-${ids.length}-${email}`, ...(role === "doctor" ? { providerProfile: { create: { verificationStatus: "verified" } } } : {}) } });
    ids.push(user.id);
  }
  [adminToken, patientToken, strangerToken] = await Promise.all(ids.map((sub, index) => signAccessToken({ sub, role: index === 0 ? "admin" : index === 1 ? "patient" : "doctor" })));
  const page = await browser.newPage();
  image = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 200; canvas.height = 70;
    const ctx = canvas.getContext("2d")!; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(10, 50); ctx.lineTo(60, 15); ctx.lineTo(85, 55); ctx.lineTo(170, 30); ctx.stroke();
    return canvas.toDataURL("image/png");
  });
  await page.close();
});

test.afterAll(async () => {
  if (providerId) {
    await db.consultation.deleteMany({ where: { appointment: { providerId } } });
    await db.appointment.deleteMany({ where: { providerId } });
    await db.slot.deleteMany({ where: { providerId } });
  }
  await db.payment.deleteMany({ where: { patientId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});

test("admin invitation activates a provider with empty fees", async ({ request }) => {
  const invited = await request.post("/api/v1/admin/users", { headers: auth(adminToken), data: { fullName: "Dr Clinical Provider", email, role: "doctor", licenceNumber: "TEST-1234" } });
  expect(invited.status()).toBe(201);
  providerId = (await invited.json()).data.id; ids.push(providerId);
  const token = `test-invite-${randomUUID()}`;
  const invite = await db.verificationCode.findFirstOrThrow({ where: { userId: providerId, channel: "invite", consumedAt: null } });
  await db.verificationCode.update({ where: { id: invite.id }, data: { codeHash: createHash("sha256").update(token).digest("hex") } });
  const activated = await request.post("/api/v1/auth/set-password", { data: { token, password: "ClinicalPass42!" } });
  expect(activated.status()).toBe(200);
  providerToken = (await activated.json()).data.accessToken;
  const profile = await request.get("/api/v1/providers/me/profile", { headers: auth(providerToken) });
  expect((await profile.json()).data).toMatchObject({ consultationFeeKes: null, homeVisitFeeKes: null });
});

test("invited provider can correct, save and clear fee inputs on a phone-sized screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().addCookies([{ name: "cb_access", value: providerToken, url: test.info().project.use.baseURL! }]);
  await page.goto("/profile");
  const section = page.locator("div.rounded-2xl").filter({ has: page.getByRole("heading", { name: "Professional profile", exact: true }) });
  const consultationFee = page.getByLabel("Consultation fee (KES)", { exact: true });
  const homeFee = page.getByLabel("Home visit fee (KES)", { exact: true });
  await expect(consultationFee).toHaveValue("");
  await consultationFee.fill("KES 1000"); await homeFee.fill("NaN");
  await section.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(section.getByRole("alert")).toContainText("whole number");
  await consultationFee.fill("1,000"); await homeFee.fill("2500");
  await page.getByLabel("Licensing body", { exact: true }).fill("Test Licensing Council");
  let saved = page.waitForResponse((r) => r.url().endsWith("/providers/me/profile") && r.request().method() === "PATCH");
  await section.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(consultationFee).toHaveValue("1000");
  await consultationFee.clear(); await homeFee.clear();
  saved = page.waitForResponse((r) => r.url().endsWith("/providers/me/profile") && r.request().method() === "PATCH");
  await section.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await saved).status()).toBe(200);
  await page.reload(); await expect(consultationFee).toHaveValue(""); await expect(homeFee).toHaveValue("");
});

test("patients cannot book a free slot or set their own waiver", async ({ request }) => {
  const start = new Date(Date.now() + 9 * 86_400_000);
  const slot = await db.slot.create({ data: { providerId, appointmentType: "teleconsult", startsAt: start, endsAt: new Date(+start + 1_800_000) } });
  const free = await request.post("/api/v1/appointments", { headers: auth(patientToken), data: { slotId: slot.id, paymentWaived: true } });
  expect(free.status()).toBe(400);
  await request.patch("/api/v1/providers/me/profile", { headers: auth(providerToken), data: { consultationFeeKes: 1000, isAvailable: true } });
  const booked = await request.post("/api/v1/appointments", { headers: auth(patientToken), data: { slotId: slot.id, feeKes: 0, paymentWaived: true } });
  expect(booked.status()).toBe(201);
  const a = (await booked.json()).data; appointmentId = a.id;
  expect(a).toMatchObject({ feeKes: 1000, paymentWaived: false });
  // A pre-existing room must not bypass the server's payment check either.
  const unpaidRoom = await db.consultation.create({ data: { appointmentId: a.id, roomName: `unpaid-${a.id}` } });
  expect((await request.post(`/api/v1/consultations/${unpaidRoom.id}/token`, { headers: auth(patientToken), data: {} })).status()).toBe(400);
  expect((await request.post(`/api/v1/appointments/${a.id}/consultation`, { headers: auth(patientToken) })).status()).toBe(403);
  expect((await request.post(`/api/v1/appointments/${a.id}/consultation`, { headers: auth(providerToken) })).status()).toBe(400);
  expect((await request.post("/api/v1/appointments/provider-meeting", { headers: auth(patientToken), data: { clientEmail: email } })).status()).toBe(403);
});

test("completed payment lets the provider start and the patient join", async ({ request }) => {
  await payAppointment(request, appointmentId, patientToken, adminToken);
  const started = await request.post(`/api/v1/appointments/${appointmentId}/consultation`, { headers: auth(providerToken) });
  expect(started.status()).toBe(201); consultationId = (await started.json()).data.id;
  expect((await issue(request)).status()).toBe(400); // no assessment yet
  const active = await request.patch(`/api/v1/consultations/${consultationId}`, { headers: auth(providerToken), data: { status: "active", clinicalNotes: "Private diagnosis not for the employer" } });
  expect(active.status()).toBe(200);
  const token = await request.post(`/api/v1/consultations/${consultationId}/token`, { headers: auth(patientToken), data: {} });
  expect(token.status()).toBe(200);
});

test("only the treating provider can issue a signed certificate, and invalid details are rejected", async ({ request }) => {
  expect((await issue(request, patientToken)).status()).toBe(403);
  expect((await issue(request, strangerToken)).status()).toBe(403);
  expect((await issue(request, providerToken, { ...body(), throughDate: "2026-11-16" })).status()).toBe(422);
  expect((await issue(request, providerToken, { ...body(), signatureDataUrl: "data:image/png;base64,bm90YW5pbWFnZQ==" })).status()).toBe(400);
  const issued = await issue(request, providerToken, { ...body(), stampDataUrl: image, providerName: "Forged" } as ReturnType<typeof body>);
  expect(issued.status()).toBe(201); const c = (await issued.json()).data; certificateId = c.id;
  expect(c).toMatchObject({ providerName: "Dr Clinical Provider", licenceNumber: "TEST-1234", licenceBody: "Test Licensing Council" });
  expect(c.signatureDataUrl).toBeUndefined();
});

test("a provider's saved signature is private, authorized, and used on prescriptions and treatment sheets", async ({ request }) => {
  const signingPath = "/api/v1/providers/me/document-signature";
  expect((await request.get(signingPath, { headers: auth(patientToken) })).status()).toBe(403);
  expect((await request.put(signingPath, { headers: auth(patientToken), data: { signatureDataUrl: image, authorize: true } })).status()).toBe(403);
  expect((await request.put(signingPath, { headers: auth(providerToken), data: { signatureDataUrl: image, authorize: false } })).status()).toBe(422);
  expect((await request.get(`/api/v1/consultations/${consultationId}/pdf`, { headers: auth(patientToken) })).status()).toBe(400);
  await authorizeDocumentSignature(request, providerToken);
  const other = await request.get(signingPath, { headers: auth(strangerToken) });
  expect((await other.json()).data).toBeNull();
  const profile = await request.get(`/api/v1/providers/${providerId}`);
  expect(JSON.stringify(await profile.json())).not.toContain("signatureDataUrl");
  const sheet = await request.get(`/api/v1/consultations/${consultationId}/pdf`, { headers: auth(patientToken) });
  expect(sheet.status()).toBe(200);
  expect(sheet.headers()["cache-control"]).toBe("private, no-store");
  const rx = await request.post(`/api/v1/consultations/${consultationId}/prescriptions`, { headers: auth(providerToken), data: {
    medications: [{ name: "Example medication", dosage: "100 mg", frequency: "Twice daily", duration: "5 days" }], instructions: "Follow the treating provider's instructions.",
  } });
  expect(rx.status()).toBe(201);
  const rxId = (await rx.json()).data.id;
  const url = `/api/v1/consultations/${consultationId}/prescriptions/${rxId}/pdf`;
  const pdf = await request.get(url, { headers: auth(patientToken) });
  expect(pdf.status()).toBe(200);
  expect((await PDFDocument.load(await pdf.body())).getAuthor()).toBe("Dr Clinical Provider");
  expect((await request.get(url, { headers: auth(strangerToken) })).status()).toBe(403);
  expect((await request.get(`/api/v1/consultations/00000000-0000-4000-8000-000000000000/prescriptions/${rxId}/pdf`, { headers: auth(patientToken) })).status()).toBe(404);
});

test("patient downloads the PDF; strangers cannot read or download it; profile edits do not alter an issued copy", async ({ request }) => {
  await request.patch("/api/v1/providers/me/profile", { headers: auth(providerToken), data: { licenceNumber: "NEW-5678", licenceBody: "New Council" } });
  const path = `/api/v1/consultations/${consultationId}/sick-offs`;
  const own = await request.get(path, { headers: auth(patientToken) }); expect(own.status()).toBe(200);
  expect((await own.json()).data[0]).toMatchObject({ id: certificateId, licenceNumber: "TEST-1234", licenceBody: "Test Licensing Council" });
  expect((await request.get(path, { headers: auth(strangerToken) })).status()).toBe(403);
  expect((await request.get(`${path}/${certificateId}/pdf`, { headers: auth(strangerToken) })).status()).toBe(403);
  const pdf = await request.get(`${path}/${certificateId}/pdf`, { headers: auth(patientToken) });
  expect(pdf.status()).toBe(200); expect(pdf.headers()["content-type"]).toBe("application/pdf");
  const bytes = await pdf.body(); expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  const document = await PDFDocument.load(bytes);
  expect(document.getPageCount()).toBeGreaterThan(0);
  expect(document.getAuthor()).toBe("Dr Clinical Provider");
  await test.info().attach("signed-sick-off.pdf", { body: bytes, contentType: "application/pdf" });
  const stored = await db.sickOff.findUniqueOrThrow({ where: { id: certificateId } });
  expect(stored.advice).toBeNull(); expect(stored.signatureDataUrl).toBe(image); expect(stored.stampDataUrl).toBeNull();
  expect(await db.auditLog.count({ where: { actorId: providerId, action: "sick_off.issued", entityId: certificateId } })).toBe(1);
});

test("provider can save their document signature from Professional profile", async ({ page }) => {
  await page.context().addCookies([{ name: "cb_access", value: providerToken, url: test.info().project.use.baseURL! }]);
  await page.goto("/profile");
  await page.getByLabel("Upload signature", { exact: true }).setInputFiles({ name: "signature.png", mimeType: "image/png", buffer: Buffer.from(image.split(",")[1], "base64") });
  await page.getByLabel("I authorize this signature on my prescriptions and clinical records.").check();
  const saved = page.waitForResponse((r) => r.url().endsWith("/providers/me/document-signature") && r.request().method() === "PUT");
  await page.getByRole("button", { name: "Save document signature" }).click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByText("Document signature saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByAltText("Your document signature preview")).toBeVisible();
});

test("provider can draw a signature and issue a sick-off from the appointment screen", async ({ page }) => {
  await page.context().addCookies([{ name: "cb_access", value: providerToken, url: test.info().project.use.baseURL! }]);
  await page.goto("/appointments"); await page.getByText("Sick-off certificates", { exact: true }).click();
  await page.getByRole("button", { name: "Issue signed sick-off" }).click();
  await page.getByLabel("First day off").fill("2026-11-17");
  await page.getByLabel("Last day off (inclusive)").fill("2026-11-18");
  await page.getByLabel("Draw your signature").scrollIntoViewIfNeeded();
  const bounds = await page.getByLabel("Draw your signature").boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + 10, bounds!.y + 30); await page.mouse.down();
  await page.mouse.move(bounds!.x + 50, bounds!.y + 10); await page.mouse.move(bounds!.x + 100, bounds!.y + 40); await page.mouse.up();
  await page.getByLabel("I assessed this patient", { exact: false }).check();
  const saved = page.waitForResponse((r) => r.url().endsWith(`/consultations/${consultationId}/sick-offs`) && r.request().method() === "POST");
  await page.getByRole("button", { name: "Sign and issue certificate" }).click();
  expect((await saved).status()).toBe(201);
  await expect(page.getByRole("link", { name: /Download signed sick-off/ })).toHaveCount(2);
});

test("patient UI downloads existing certificates and cannot issue one", async ({ page }) => {
  await page.context().addCookies([{ name: "cb_access", value: patientToken, url: test.info().project.use.baseURL! }]);
  await page.goto("/appointments"); await page.getByText("Sick-off certificates", { exact: true }).click();
  await expect(page.getByRole("link", { name: /Download signed sick-off/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Issue signed sick-off" })).toHaveCount(0);
});

test("patient can download the signed treatment sheet from Records", async ({ page }) => {
  await page.context().addCookies([{ name: "cb_access", value: patientToken, url: test.info().project.use.baseURL! }]);
  await page.goto("/records");
  await page.getByRole("button", { name: "Consultations", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/^treatment-sheet-.*\.pdf$/);
});
