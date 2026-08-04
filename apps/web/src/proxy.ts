import { NextResponse, type NextRequest } from "next/server";

// ── Rate limiting (in-memory sliding window, per cold start) ──────────────────
const RATE_RULES: Record<string, { max: number; windowMs: number; method?: string }> = {
  "/api/v1/auth/login":           { max: 10, windowMs: 60_000, method: "POST" },
  "/api/v1/auth/register":        { max: 5,  windowMs: 60_000, method: "POST" },
  "/api/v1/payments/mpesa/stk":   { max: 10, windowMs: 60_000, method: "POST" },
  "/api/v1/payments/till/submit": { max: 10, windowMs: 60_000, method: "POST" },
  "/api/v1/orders":               { max: 10, windowMs: 60_000, method: "POST" },
  "/api/v1/home-visits":          { max: 10, windowMs: 60_000, method: "POST" },
};
interface RateEntry { count: number; resetAt: number }
const rateStore = new Map<string, RateEntry>();

function checkRateLimit(pathname: string, req: NextRequest): Response | null {
  const rule = RATE_RULES[pathname];
  if (!rule) return null;
  if (rule.method && rule.method !== req.method) return null;
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const key = `${pathname}:${clientIp}`;
  const now = Date.now();
  const entry = rateStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateStore.set(key, { count: 1, resetAt: now + rule.windowMs });
    return null;
  }
  entry.count += 1;
  if (entry.count > rule.max) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests. Please slow down." } },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
          "X-RateLimit-Limit": String(rule.max),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }
  return null;
}

// CORS for the public API so mobile apps and other clients can consume it.
// Native apps ignore CORS, but this enables web/hybrid (Expo web, Capacitor) and
// browser SDK consumers from any origin. Auth uses bearer tokens (not cookies),
// so a wildcard origin is safe here.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-Id",
  "Access-Control-Max-Age": "86400",
};

/**
 * Proxy — runs before every request (Next.js 16's renamed `middleware`).
 * Stamps each request with X-Request-ID, enforces auth rate limits, and applies
 * CORS to the versioned API so it's consumable by mobile / external clients.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/v1");

  // Preflight — answer immediately with the CORS policy.
  if (isApi && req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  const rateLimited = checkRateLimit(pathname, req);
  if (rateLimited) {
    if (isApi) for (const [k, v] of Object.entries(CORS_HEADERS)) rateLimited.headers.set(k, v);
    return rateLimited;
  }

  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const res = NextResponse.next({
    request: { headers: new Headers({ ...Object.fromEntries(req.headers), "x-request-id": requestId }) },
  });
  res.headers.set("x-request-id", requestId);
  if (isApi) for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
