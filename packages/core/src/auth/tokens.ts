import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "node:crypto";
import type { UserRole } from "@carebora/shared";

const encoder = new TextEncoder();

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET is not set (or too short). Add it to your environment.");
  }
  return encoder.encode(secret);
}

const ACCESS_TTL_SECONDS = Number(process.env.JWT_ACCESS_TTL ?? "900");

export interface AccessClaims {
  sub: string; // user id
  role: UserRole;
}

/** Sign a short-lived, stateless access token (HS256). */
export async function signAccessToken(claims: AccessClaims): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TTL_SECONDS)
    .sign(secretKey());
}

/** Verify an access token and return its claims, or throw. */
export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, secretKey());
  return { sub: String(payload.sub), role: payload.role as UserRole };
}

/** Opaque refresh token (stored only as a hash, server-side). */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
