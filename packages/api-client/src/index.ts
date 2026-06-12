import type { ApiResult } from "@carebora/shared";
import { ApiError, ErrorCode } from "@carebora/shared";

/**
 * Typed CareBora API client. The web app and the future mobile app both import
 * this — one definition of how to talk to the backend.
 *
 * Auth token handling is pluggable via `getToken` so web (cookie/bearer) and
 * mobile (secure storage bearer) can supply credentials their own way.
 */
export interface ClientOptions {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
}

export class CareBoraClient {
  constructor(private readonly opts: ClientOptions) {}

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const token = (await this.opts.getToken?.()) ?? null;
    const res = await fetch(`${this.opts.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

    let body: ApiResult<T>;
    try {
      body = (await res.json()) as ApiResult<T>;
    } catch {
      throw new ApiError(ErrorCode.INTERNAL, "Invalid response from server");
    }

    if (!res.ok || "error" in body) {
      const e = (body as { error?: { code: ErrorCode; message: string } }).error;
      throw new ApiError(e?.code ?? ErrorCode.INTERNAL, e?.message ?? "Request failed");
    }
    return (body as { data: T }).data;
  }

  // ── Endpoints (added per milestone). ──
  health() {
    return this.request<{ status: string; db: "up" | "down"; time: string }>(
      "/health",
    );
  }
}

export function createClient(opts: ClientOptions) {
  return new CareBoraClient(opts);
}
