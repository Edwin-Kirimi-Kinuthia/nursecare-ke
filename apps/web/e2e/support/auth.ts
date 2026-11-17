import { createHash, randomInt } from "node:crypto";
import { expect, type APIRequestContext } from "@playwright/test";
import { db } from "@carebora/db";
import { signAccessToken } from "@carebora/core";

/** Seeded identities are fixtures for business-flow tests; OTP is tested in auth.spec.ts. */
export async function seededSession(email: string) {
  if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).hostname !== "localhost" && new URL(process.env.DATABASE_URL).hostname !== "127.0.0.1") {
    throw new Error("Seeded sessions require the local disposable E2E database");
  }
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  return { accessToken: await signAccessToken({ sub: user.id, role: user.role }) };
}

/** Emulate receipt of the email in the disposable database, then use the real verification endpoint. */
export async function completeLogin(request: APIRequestContext, email: string, password: string) {
  const challenge = await request.post("/api/v1/auth/login", { data: { email, password } });
  expect(challenge.status()).toBe(200);
  expect((await challenge.json()).data).toMatchObject({ requiresOtp: true, email });
  const record = await db.verificationCode.findFirstOrThrow({
    where: { user: { email }, channel: "login_otp", consumedAt: null }, orderBy: { createdAt: "desc" },
  });
  const code = String(randomInt(100000, 1000000));
  await db.verificationCode.update({ where: { id: record.id }, data: { codeHash: createHash("sha256").update(code).digest("hex") } });
  const verified = await request.post("/api/v1/auth/login/verify-otp", { data: { email, code } });
  expect(verified.status()).toBe(200);
  expect((await db.verificationCode.findUniqueOrThrow({ where: { id: record.id } })).consumedAt).not.toBeNull();
  return verified;
}
