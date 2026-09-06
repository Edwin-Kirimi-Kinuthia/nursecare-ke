import { z } from "zod";
import { ApiError, ErrorCode } from "./errors";

/**
 * Standard API response envelopes. Every CareBora endpoint returns one of these,
 * so every client (web, mobile) parses responses the same way.
 */
export type ApiSuccess<T> = { data: T; error?: never };
export type ApiFailure = {
  data?: never;
  error: { code: ErrorCode; message: string; details?: unknown };
};
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T): ApiSuccess<T> {
  return { data };
}

export function fail(
  code: ErrorCode,
  message: string,
  details?: unknown,
): ApiFailure {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

/**
 * Prisma's error code for a thrown value, if it is one.
 *
 * Duck-typed on purpose: this package depends only on zod, and importing the
 * Prisma client here just to name an error class would drag the whole database
 * layer into every consumer.
 */
function prismaErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const e = err as { name?: unknown; code?: unknown };
  if (typeof e.name !== "string" || !e.name.startsWith("PrismaClient")) return undefined;
  return typeof e.code === "string" ? e.code : undefined;
}

/**
 * Normalize any thrown value into a {status, body} pair for the API layer.
 * Handles ApiError, Zod validation errors, bad client input, and unknown errors.
 */
export function toErrorResponse(err: unknown): {
  status: number;
  body: ApiFailure;
} {
  if (err instanceof ApiError) {
    return {
      status: err.status,
      body: fail(err.code, err.message, err.details),
    };
  }
  if (err instanceof z.ZodError) {
    return {
      status: 422,
      body: fail(ErrorCode.VALIDATION_ERROR, "Validation failed", err.flatten()),
    };
  }
  // A body that isn't valid JSON is the caller's mistake, not a server fault.
  // Left as a 500 it would be indistinguishable from a real outage in alerting,
  // and any bot posting junk could bury genuine incidents.
  if (err instanceof SyntaxError) {
    return {
      status: 400,
      body: fail(ErrorCode.BAD_REQUEST, "Request body is not valid JSON"),
    };
  }
  // Known Prisma failures that are caused by the request rather than the server.
  // Only these specific codes are mapped — anything else (a dropped connection,
  // say) must stay a 500 so real outages still surface as outages.
  switch (prismaErrorCode(err)) {
    // P2023: malformed value for a typed column — a non-UUID id in the path.
    // P2025: the row the operation required doesn't exist.
    case "P2023":
    case "P2025":
      return { status: 404, body: fail(ErrorCode.NOT_FOUND, "Not found") };
    // P2002 unique violation, P2003 foreign-key violation.
    case "P2002":
    case "P2003":
      return { status: 409, body: fail(ErrorCode.CONFLICT, "That conflicts with existing data") };
    default:
      break;
  }
  // Avoid leaking internals to clients.
  return {
    status: 500,
    body: fail(ErrorCode.INTERNAL, "Something went wrong"),
  };
}

/** Pagination query shared across list endpoints. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;
