import { randomUUID } from "node:crypto";
import { db } from "@carebora/db";
import { signAccessToken } from "@carebora/core";
import { test, expect } from "@playwright/test";

test.describe("Earnings account", () => {
  test.beforeAll(() => {
    if (!process.env.DATABASE_URL || !["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error("Requires a disposable local database");
  });
  for (const role of ["doctor", "nurse", "physio", "pharmacy"] as const) test(`${role}: isolates balances, reserves atomically, deduplicates retries and records manual M-Pesa payout`, async ({ request }) => {
    const tag = randomUUID();
    const provider = await db.user.create({ data: { email: `earnings-${tag}@example.com`, fullName: "Earnings test", role } });
    const other = await db.user.create({ data: { email: `other-${tag}@example.com`, fullName: "Other account", role: "nurse" } });
    const admin = await db.user.create({ data: { email: `admin-${tag}@example.com`, fullName: "Admin test", role: "admin" } });
    const patient = await db.user.create({ data: { email: `patient-${tag}@example.com`, fullName: "Patient test", role: "patient" } });
    const headers = async (u: typeof provider) => ({ Authorization: `Bearer ${await signAccessToken({ sub: u.id, role: u.role })}` });
    const ph = await headers(provider), oh = await headers(other), ah = await headers(admin), patientHeaders = await headers(patient);
    const payment = await db.payment.create({ data: { patientId: patient.id, providerId: provider.id, subjectType: "appointment", subjectId: randomUUID(), gatewayRef: tag, status: "completed", amountKes: 1000, commissionPercentSnapshot: 20, phoneNumber: "254712345678", ledgerEntries: { create: { type: "provider_payout", providerId: provider.id, amountKes: 800 } } } });
    try {
      expect((await request.get("/api/v1/earnings")).status()).toBe(401);
      expect((await request.get("/api/v1/earnings", { headers: patientHeaders })).status()).toBe(403);
      expect((await (await request.get("/api/v1/earnings", { headers: oh })).json()).data.availableKes).toBe(0);
      const input = { amountKes: 500, phoneNumber: "0712345678", requestKey: randomUUID() };
      const responses = await Promise.all([1, 2, 3].map(() => request.post("/api/v1/earnings/withdrawals", { headers: ph, data: input })));
      expect(responses.map(r => r.status())).toEqual([201, 201, 201]);
      const payouts = await Promise.all(responses.map(r => r.json()));
      expect(new Set(payouts.map(r => r.data.id)).size).toBe(1);
      const w = payouts[0].data;
      const queue = await (await request.get("/api/v1/admin/withdrawals", { headers: ah })).json();
      expect(queue.data.some((entry: { id: string }) => entry.id === w.id)).toBe(true);
      expect(w.gateway).toBeNull();
      expect(w.phoneNumber).toBe("254712345678");
      const concurrent = await Promise.all([1, 2].map(() => request.post("/api/v1/earnings/withdrawals", { headers: ph, data: { ...input, amountKes: 300, requestKey: randomUUID() } })));
      expect(concurrent.map(r => r.status()).sort()).toEqual([201, 400]);
      expect((await request.patch(`/api/v1/admin/withdrawals/${w.id}`, { headers: ph, data: { status: "paid", reference: "ABC1234567" } })).status()).toBe(403);
      expect((await request.patch(`/api/v1/admin/withdrawals/${w.id}`, { headers: ah, data: { status: "paid", reference: "ABC1234567" } })).status()).toBe(409);
      expect((await request.patch(`/api/v1/admin/withdrawals/${w.id}`, { headers: ah, data: { status: "processing" } })).status()).toBe(200);
      expect((await request.patch(`/api/v1/admin/withdrawals/${w.id}`, { headers: ah, data: { status: "paid" } })).status()).toBe(400);
      expect((await request.patch(`/api/v1/admin/withdrawals/${w.id}`, { headers: ah, data: { status: "paid", reference: "ABC1234567" } })).status()).toBe(200);
      expect((await request.patch(`/api/v1/admin/withdrawals/${w.id}`, { headers: ah, data: { status: "failed" } })).status()).toBe(409);
      expect((await (await request.get("/api/v1/earnings", { headers: ph })).json()).data).toMatchObject({ earnedKes: 800, availableKes: 0, pendingKes: 300, paidKes: 500 });
      const remaining = await db.payout.findFirstOrThrow({ where: { providerId: provider.id, status: "pending" } });
      expect((await request.patch(`/api/v1/admin/withdrawals/${remaining.id}`, { headers: ah, data: { status: "processing" } })).status()).toBe(200);
      expect((await request.patch(`/api/v1/admin/withdrawals/${remaining.id}`, { headers: ah, data: { status: "paid", reference: "ABC1234567" } })).status()).toBe(409);
      expect((await request.patch(`/api/v1/admin/withdrawals/${remaining.id}`, { headers: ah, data: { status: "failed" } })).status()).toBe(200);
      expect((await (await request.get("/api/v1/earnings", { headers: ph })).json()).data.availableKes).toBe(300);
    } finally {
      await db.payout.deleteMany({ where: { providerId: provider.id } });
      await db.auditLog.deleteMany({ where: { actorId: { in: [provider.id, admin.id] } } });
      await db.payment.delete({ where: { id: payment.id } });
      await db.user.deleteMany({ where: { id: { in: [provider.id, other.id, admin.id, patient.id] } } });
    }
  });
});


test("vendor owners can only see their organization; staff and suspended businesses cannot withdraw", async ({ request }) => {
  if (!process.env.DATABASE_URL || !["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error("Requires a disposable local database");
  const tag = randomUUID();
  const owner = await db.user.create({ data: { email: `owner-${tag}@example.com`, fullName: "Owner test", role: "vendor" } });
  const staff = await db.user.create({ data: { email: `staff-${tag}@example.com`, fullName: "Staff test", role: "vendor" } });
  const org = await db.organization.create({ data: { name: "Test pharmacy", slug: tag, type: "pharmacy", status: "approved", members: { create: [{ userId: owner.id, role: "owner" }, { userId: staff.id, role: "staff" }] } } });
  const payment = await db.payment.create({ data: { patientId: owner.id, orgId: org.id, subjectType: "order", subjectId: randomUUID(), gatewayRef: tag, status: "completed", amountKes: 1000, commissionPercentSnapshot: 20, phoneNumber: "254712345678", ledgerEntries: { create: { type: "vendor_payout", orgId: org.id, amountKes: 800 } } } });
  const headers = { Authorization: `Bearer ${await signAccessToken({ sub: owner.id, role: "vendor" })}` };
  const staffHeaders = { Authorization: `Bearer ${await signAccessToken({ sub: staff.id, role: "vendor" })}` };
  try {
    expect((await (await request.get("/api/v1/earnings", { headers })).json()).data.availableKes).toBe(800);
    expect((await request.get("/api/v1/earnings", { headers: staffHeaders })).status()).toBe(403);
    expect((await request.post("/api/v1/earnings/withdrawals", { headers: staffHeaders, data: { amountKes: 100, phoneNumber: "0712345678", requestKey: randomUUID() } })).status()).toBe(403);
    expect((await request.post("/api/v1/earnings/withdrawals", { headers, data: { amountKes: -1, phoneNumber: "123", requestKey: randomUUID() } })).status()).toBe(422);
    await db.organization.update({ where: { id: org.id }, data: { status: "suspended" } });
    expect((await request.get("/api/v1/earnings", { headers })).status()).toBe(403);
  } finally {
    await db.payment.delete({ where: { id: payment.id } });
    await db.organization.delete({ where: { id: org.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, staff.id] } } });
  }
});
