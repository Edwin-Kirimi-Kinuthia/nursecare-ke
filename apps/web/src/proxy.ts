import { NextResponse, type NextRequest } from "next/server";

// ── Rate limiting (in-memory sliding window, per cold start) ──────────────────
/**
 * Per-IP limits, sized for the fact that a single IP here is very often a whole
 * population rather than one person: Kenyan mobile traffic sits behind
 * carrier-grade NAT, so thousands of Safaricom subscribers can share one public
 * address, as can an office, campus or cybercafé.
 *
 * These exist to stop a runaway script, not to pace real customers. Set near
 * one-person-per-IP rates (10/min for checkout, say) they would reject genuine
 * paying users during any busy minute — a silent revenue bug that would look
 * like "the app is broken" rather than like rate limiting. Per-user limits would
 * be the sharper tool; until then these stay deliberately generous.
 */
const RATE_RULES: Record<string, { max: number; windowMs: number; method?: string }> = {
  "/api/v1/auth/login":           { max: 60,  windowMs: 60_000, method: "POST" },
  "/api/v1/auth/register":        { max: 40,  windowMs: 60_000, method: "POST" },
  "/api/v1/payments/mpesa/stk":   { max: 60,  windowMs: 60_000, method: "POST" },
  "/api/v1/payments/till/submit": { max: 60,  windowMs: 60_000, method: "POST" },
  "/api/v1/orders":               { max: 60,  windowMs: 60_000, method: "POST" },
  "/api/v1/home-visits":          { max: 60,  windowMs: 60_000, method: "POST" },
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

/** NUL, which Postgres rejects in any text column. */
const NUL = String.fromCharCode(0);

/**
 * True if a query string carries something the database can never store, or is
 * escaped so badly it can't be decoded. Deliberately total — it must not throw,
 * since it runs before every request.
 */
function hasUnstorableChars(search: string): boolean {
  if (!search) return false;
  if (search.includes(NUL)) return true;
  if (/%00/i.test(search)) return true;
  try {
    return decodeURIComponent(search).includes(NUL);
  } catch {
    // Malformed percent-escape (e.g. "%ZZ"): decodeURIComponent throws, and so
    // would anything downstream that tried to read it.
    return true;
  }
}

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

  // Postgres cannot store a NUL in a text column, so any request carrying one
  // fails deep inside the driver and surfaces as a 500. Rejecting it here — once,
  // for the whole surface — keeps malformed input out of the error budget, where
  // it would otherwise be indistinguishable from a real outage.
  if (isApi && hasUnstorableChars(req.nextUrl.search)) {
    const res = NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Request contains an invalid character." } },
      { status: 400 },
    );
    for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
    return res;
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
