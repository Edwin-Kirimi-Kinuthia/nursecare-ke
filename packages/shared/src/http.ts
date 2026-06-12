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
 * Normalize any thrown value into a {status, body} pair for the API layer.
 * Handles ApiError, Zod validation errors, and unknown errors uniformly.
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
