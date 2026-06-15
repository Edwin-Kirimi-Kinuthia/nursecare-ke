import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy — runs before every request (Next.js 16's renamed `middleware`).
 * Stamps each request with a unique X-Request-ID so traces can be correlated
 * across logs, errors, and client-side reporting.
 *
 * Runs in the Edge runtime, so we use the Web Crypto API (globalThis.crypto)
 * rather than node:crypto, which is unavailable here.
 */
export function proxy(req: NextRequest) {
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
