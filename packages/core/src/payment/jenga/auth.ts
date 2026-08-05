/** Jenga API (Equity/Finserve) OAuth-style merchant authentication, with token caching. */
import { getEnv } from "../../config/env";

function baseUrl(): string {
  return getEnv().JENGA_ENV === "production"
    ? "https://api.finserve.africa"
    : "https://uat.finserve.africa";
}

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

let cached: CachedToken | null = null;

interface AuthResponse {
  accessToken?: string;
  expiresIn?: number; // seconds
  tokenType?: string;
}

/**
 * Returns a cached access token, refreshing at 80% of its TTL. Unlike the Daraja
 * client (which fetches a fresh OAuth token on every single STK push), this avoids
 * an extra round trip on every payment.
 */
export async function getJengaToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) return cached.accessToken;

  const env = getEnv();
  if (!env.JENGA_API_KEY || !env.JENGA_MERCHANT_CODE || !env.JENGA_CONSUMER_SECRET) {
    throw new Error("JENGA_API_KEY / JENGA_MERCHANT_CODE / JENGA_CONSUMER_SECRET not set");
  }

  const res = await fetch(`${baseUrl()}/authentication/api/v3/authenticate/merchant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": env.JENGA_API_KEY,
    },
    body: JSON.stringify({
      merchantCode: env.JENGA_MERCHANT_CODE,
      consumerSecret: env.JENGA_CONSUMER_SECRET,
    }),
  });

  const json = (await res.json()) as AuthResponse;
  if (!res.ok || !json.accessToken) {
    throw new Error(`Jenga auth failed: ${res.status}`);
  }

  const ttlMs = (json.expiresIn ?? 900) * 1000;
  cached = { accessToken: json.accessToken, expiresAt: Date.now() + ttlMs * 0.8 };
  return cached.accessToken;
}

export function jengaBaseUrl(): string {
  return baseUrl();
}

/** Test-only: clears the cached token. */
export function __resetJengaTokenCacheForTests(): void {
  cached = null;
}
