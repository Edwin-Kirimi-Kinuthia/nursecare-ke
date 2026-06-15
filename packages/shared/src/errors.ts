/**
 * Canonical error codes for the CareBora API.
 * Clients (web + future mobile) switch on `code`, never on message strings.
 */
export const ErrorCode = {
  // 400s
  VALIDATION_ERROR: "VALIDATION_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  // 500s
  INTERNAL: "INTERNAL",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 422,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Application error carrying an HTTP status, a stable code, and optional details.
 * Thrown by services; translated to the standard envelope by the API layer.
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    super(message ?? code);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }

  static unauthorized(message = "Authentication required") {
    return new ApiError(ErrorCode.UNAUTHORIZED, message);
  }
  static forbidden(message = "You do not have access to this resource") {
    return new ApiError(ErrorCode.FORBIDDEN, message);
  }
  static notFound(message = "Resource not found") {
    return new ApiError(ErrorCode.NOT_FOUND, message);
  }
  static conflict(message = "Resource already exists") {
    return new ApiError(ErrorCode.CONFLICT, message);
  }
  static badRequest(message = "Invalid request", details?: unknown) {
    return new ApiError(ErrorCode.BAD_REQUEST, message, details);
  }
  static serviceUnavailable(message = "Service temporarily unavailable", details?: unknown) {
    return new ApiError(ErrorCode.SERVICE_UNAVAILABLE, message, details);
  }
}
