import { NextResponse, type NextRequest } from "next/server";

// ── Rate limiting (in-memory sliding window, per cold start) ──────────────────
const RATE_RULES: Record<string, { max: number; windowMs: number }> = {
  "/api/v1/auth/login":    { max: 10, windowMs: 60_000 },
  "/api/v1/auth/register": { max: 5,  windowMs: 60_000 },
};
interface RateEntry { count: number; resetAt: number }
const rateStore = new Map<string, RateEntry>();

function checkRateLimit(pathname: string, req: NextRequest): Response | null {
  const rule = RATE_RULES[pathname];
  if (!rule) return null;
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

/**
 * Proxy — runs before every request (Next.js 16's renamed `middleware`).
 * Stamps each request with X-Request-ID and enforces rate limits on auth endpoints.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const rateLimited = checkRateLimit(pathname, req);
  if (rateLimited) return rateLimited;

  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const res = NextResponse.next({
    request: { headers: new Headers({ ...Object.fromEntries(req.headers), "x-request-id": requestId }) },
  });
  res.headers.set("x-request-id", requestId);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
