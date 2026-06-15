import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";

/**
 * Edge middleware — runs before every request.
 * Stamps each request with a unique X-Request-ID so traces can be correlated
 * across logs, errors, and client-side reporting.
 */
export function middleware(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const res = NextResponse.next({
    request: { headers: new Headers({ ...Object.fromEntries(req.headers), "x-request-id": requestId }) },
  });
  res.headers.set("x-request-id", requestId);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
