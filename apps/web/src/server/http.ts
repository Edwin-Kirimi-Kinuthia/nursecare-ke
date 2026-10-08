import { NextResponse } from "next/server";
import { ok, toErrorResponse } from "@carebora/shared";

/**
 * API-layer helpers. Route handlers stay thin: they parse input, call a service
 * from @carebora/core, and return through these so every response uses the same
 * `{ data }` / `{ error }` envelope.
 */

export function jsonOk<T>(data: T, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(ok(data), { status, ...(headers ? { headers } : {}) });
}

export function jsonError(err: unknown) {
  const { status, body } = toErrorResponse(err);
  return NextResponse.json(body, { status });
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response> | Response;

/** Wrap a route handler so any thrown ApiError/ZodError becomes a clean envelope. */
export function route<C>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return jsonError(err);
    }
  };
}
