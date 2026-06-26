import { NextRequest, NextResponse } from "next/server";

/**
 * Edge middleware — rate-limits sensitive auth endpoints.
 *
 * Uses a sliding-window counter stored in a module-level Map.
 * Per-cold-start (fine for serverless demo; swap for Upstash Redis in prod).
 *
 * Limits:
 *   /api/v1/auth/login    → 10 req / 60 s per IP
 *   /api/v1/auth/register → 5  req / 60 s per IP
 *   /api/v1/payments/mpesa/callback → pass-through (Safaricom webhook, no IP limit)
 */

const WINDOWS: Record<string, { max: number; windowMs: number }> = {
  "/api/v1/auth/login":    { max: 10, windowMs: 60_000 },
  "/api/v1/auth/register": { max: 5,  windowMs: 60_000 },
};

interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>();

function ip(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const rule = WINDOWS[pathname];
  if (!rule) return NextResponse.next();

  const key = `${pathname}:${ip(req)}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + rule.windowMs });
    return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/v1/auth/login", "/api/v1/auth/register"],
};
