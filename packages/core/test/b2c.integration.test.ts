import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "@carebora/db";
import { earningsService } from "../src/payment/earnings.service";
import { b2cService } from "../src/payment/b2c.service";

if (!process.env.DATABASE_URL || !["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error("Use a disposable local database");
Object.assign(process.env, { PAYOUTS_MODE: "mpesa_b2c", MPESA_B2C_ENV: "sandbox", MPESA_B2C_CONSUMER_KEY: "test-key", MPESA_B2C_CONSUMER_SECRET: "test-secret", MPESA_B2C_INITIATOR: "testapi", MPESA_B2C_SECURITY_CREDENTIAL: "test-encrypted-credential", MPESA_B2C_SHORTCODE: "600000", MPESA_B2C_CALLBACK_BASE_URL: "https://example.com/api/v1/payouts/b2c" });
after(() => db.$disconnect());

async function fixture(run: (f: { id: string; payee: { providerId: string }; withdraw: (amountKes: number) => ReturnType<typeof earningsService.withdraw> }) => Promise<void>) {
  const user = await db.user.create({ data: { fullName: "B2C test", email: `b2c-${randomUUID()}@example.com`, role: "doctor" } });
  const payee = { providerId: user.id };
  const payment = await db.payment.create({ data: { patientId: user.id, providerId: user.id, subjectType: "appointment", subjectId: randomUUID(), gatewayRef: randomUUID(), amountKes: 1000, commissionPercentSnapshot: 0, phoneNumber: "254712345678", status: "completed", ledgerEntries: { create: { type: "provider_payout", providerId: user.id, amountKes: 1000 } } } });
  const withdraw = (amountKes: number) => earningsService.withdraw(payee, user.id, { amountKes, phoneNumber: "254712345678", requestKey: randomUUID() });
  try { await run({ id: user.id, payee, withdraw }); }
  finally {
    const ids = (await db.payout.findMany({ where: payee, select: { id: true } })).map(p => p.id);
    await db.auditLog.deleteMany({ where: { OR: [{ actorId: user.id }, { entityId: { in: ids } }] } });
    await db.payout.deleteMany({ where: payee }); await db.payment.delete({ where: { id: payment.id } }); await db.user.delete({ where: { id: user.id } });
  }
}

test("one outbound disbursement across concurrent retries; authenticated callbacks settle once", async () => fixture(async f => {
  const original = globalThis.fetch; let sends = 0; let body: Record<string, unknown> = {};
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    assert.ok(url.startsWith("https://sandbox.safaricom.co.ke/"));
    if (url.includes("/oauth/")) return new Response(JSON.stringify({ access_token: "mock-access" }));
    sends++; body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ ResponseCode: "0", ConversationID: "AG_test_1" }));
  };
  try {
    await assert.rejects(() => f.withdraw(1), /Minimum/);
    const w = await f.withdraw(500);
    const responses = await Promise.all([1, 2, 3].map(() => b2cService.send(w.id)));
    assert.equal(sends, 1); assert.ok(responses.every(p => p.status === "processing"));
    const token = new URL(String(body.ResultURL)).searchParams.get("token")!;
    const result = { ResultCode: 0, ResultDesc: "Success", OriginatorConversationID: String(body.OriginatorConversationID), ConversationID: "AG_test_1", TransactionID: "ABC1234567", ResultParameters: { ResultParameter: [{ Key: "TransactionAmount", Value: 500 }, { Key: "ReceiverPartyPublicName", Value: "254712345678 - Test Name" }, { Key: "TransactionReceipt", Value: "ABC1234567" }] } };
    await assert.rejects(() => b2cService.callback(w.id, "bad-token", result), /Invalid callback/);
    await assert.rejects(() => b2cService.callback(w.id, token, { ...result, ConversationID: "wrong", OriginatorConversationID: "wrong" }), /Unmatched/);
    await Promise.all([1, 2, 3].map(() => b2cService.callback(w.id, token, result)));
    const summary = await earningsService.summary(f.payee);
    assert.equal(summary.availableKes, 500); assert.equal(summary.paidKes, 500); assert.equal(summary.pendingKes, 0);
    assert.equal(summary.withdrawals[0]!.reference, "ABC1234567");
    assert.equal("callbackTokenHash" in summary.withdrawals[0]!, false);
    await b2cService.send(w.id); assert.equal(sends, 1);
    await assert.rejects(() => earningsService.process(w.id, f.id, { status: "failed" }), /handled by M-Pesa/);
  } finally { globalThis.fetch = original; }
}));

test("uncertain POST outcomes reserve funds; retries never send again; reconciliation is explicit", async () => fixture(async f => {
  const original = globalThis.fetch; let sends = 0;
  globalThis.fetch = async input => {
    if (String(input).includes("/oauth/")) return new Response(JSON.stringify({ access_token: "mock-access" }));
    sends++; throw new Error("Connection lost after sending");
  };
  try {
    const w = await f.withdraw(600);
    assert.equal((await b2cService.send(w.id)).status, "review");
    assert.equal((await b2cService.send(w.id)).status, "review"); assert.equal(sends, 1);
    assert.equal((await earningsService.summary(f.payee)).availableKes, 400);
    await b2cService.reconcile(w.id, f.id, { outcome: "failed", note: "Verified against M-Pesa statement: no transfer completed." });
    assert.equal((await earningsService.summary(f.payee)).availableKes, 1000);
  } finally { globalThis.fetch = original; }
}));

test("timeouts and mismatched successful results retain reservations; confirmed failure releases them", async () => fixture(async f => {
  const original = globalThis.fetch; let body: Record<string, unknown> = {};
  globalThis.fetch = async (input, init) => {
    if (String(input).includes("/oauth/")) return new Response(JSON.stringify({ access_token: "mock-access" }));
    body = JSON.parse(String(init?.body)); return new Response(JSON.stringify({ ResponseCode: "0", ConversationID: "AG_test_2" }));
  };
  try {
    const w = await f.withdraw(400); await b2cService.send(w.id);
    const token = new URL(String(body.ResultURL)).searchParams.get("token")!;
    const result = { ResultCode: 0, ResultDesc: "Success", OriginatorConversationID: String(body.OriginatorConversationID), ConversationID: "AG_test_2", TransactionID: "ABC1234568", ResultParameters: { ResultParameter: [{ Key: "TransactionAmount", Value: 999 }, { Key: "ReceiverPartyPublicName", Value: "254712345678 - Test" }] } };
    await b2cService.callback(w.id, token, result, true);
    assert.equal((await earningsService.summary(f.payee)).availableKes, 600);
    await b2cService.callback(w.id, token, result);
    assert.equal((await earningsService.summary(f.payee)).pendingKes, 400);
    await b2cService.callback(w.id, token, { ...result, ResultCode: 1, ResultDesc: "Insufficient funds" });
    assert.equal((await earningsService.summary(f.payee)).availableKes, 1000);
  } finally { globalThis.fetch = original; }
}));

test("OAuth failure never submits money and leaves an unattempted request retryable", async () => fixture(async f => {
  const original = globalThis.fetch; let sends = 0; let authorize = false;
  globalThis.fetch = async input => {
    if (String(input).includes("/oauth/")) return new Response(JSON.stringify(authorize ? { access_token: "mock-access" } : { error: "Unavailable" }), { status: authorize ? 200 : 503 });
    sends++; return new Response(JSON.stringify({ ResponseCode: "0", ConversationID: "AG_test_3" }));
  };
  try {
    const w = await f.withdraw(200);
    assert.equal((await b2cService.send(w.id)).status, "pending"); assert.equal(sends, 0);
    assert.equal((await db.payout.findUniqueOrThrow({ where: { id: w.id } })).submittedAt, null);
    authorize = true;
    assert.equal((await b2cService.send(w.id)).status, "processing"); assert.equal(sends, 1);
  } finally { globalThis.fetch = original; }
}));

test("explicit gateway rejection releases the reservation and cannot be resent", async () => fixture(async f => {
  const original = globalThis.fetch; let sends = 0;
  globalThis.fetch = async input => {
    if (String(input).includes("/oauth/")) return new Response(JSON.stringify({ access_token: "mock-access" }));
    sends++; return new Response(JSON.stringify({ errorCode: "400.002.02" }), { status: 400 });
  };
  try {
    const w = await f.withdraw(250);
    assert.equal((await b2cService.send(w.id)).status, "failed");
    assert.equal((await earningsService.summary(f.payee)).availableKes, 1000);
    await b2cService.send(w.id); assert.equal(sends, 1);
  } finally { globalThis.fetch = original; }
}));
