import type {
  ApiResult,
  AuthResult,
  LoginInput,
  PatchPatientProfileInput,
  PatchProviderProfileInput,
  PublicUser,
  RegisterInput,
} from "@carebora/shared";
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

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = (await this.opts.getToken?.()) ?? null;
    const res = await fetch(`${this.opts.baseUrl}${path}`, {
      ...init,
      credentials: "include",
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

  private post<T>(path: string, payload: unknown) {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(payload) });
  }

  private patch<T>(path: string, payload: unknown) {
    return this.request<T>(path, { method: "PATCH", body: JSON.stringify(payload) });
  }

  // ── Health ──
  health() {
    return this.request<{ status: string; db: "up" | "down"; time: string }>("/health");
  }

  // ── Auth (M1) ──
  register(input: RegisterInput) {
    return this.post<AuthResult>("/auth/register", input);
  }
  login(input: LoginInput) {
    return this.post<AuthResult>("/auth/login", input);
  }
  me() {
    return this.request<PublicUser>("/auth/me");
  }
  /** Web: pass no arg (uses httpOnly cookie). Mobile: pass the stored refresh token. */
  refresh(refreshToken?: string) {
    return this.post<AuthResult>("/auth/refresh", refreshToken ? { refreshToken } : {});
  }
  /** Web: pass no arg (uses httpOnly cookie). Mobile: pass the stored refresh token. */
  logout(refreshToken?: string) {
    return this.post<{ loggedOut: boolean }>("/auth/logout", refreshToken ? { refreshToken } : {});
  }

  // ── Patient profile (M1) ──
  getPatientProfile() {
    return this.request<PatientProfile>("/patients/me/profile");
  }
  patchPatientProfile(data: PatchPatientProfileInput) {
    return this.patch<PatientProfile>("/patients/me/profile", data);
  }

  // ── Provider profile (M1) ──
  getProviderProfile() {
    return this.request<ProviderProfile>("/providers/me/profile");
  }
  patchProviderProfile(data: PatchProviderProfileInput) {
    return this.patch<ProviderProfile>("/providers/me/profile", data);
  }
}

export function createClient(opts: ClientOptions) {
  return new CareBoraClient(opts);
}

// ── Response types ──
export interface PatientProfile {
  userId: string;
  dateOfBirth: string | null;
  gender: string | null;
  county: string | null;
  town: string | null;
  addressLine: string | null;
  bloodGroup: string | null;
  allergies: string[];
  chronicConditions: string[];
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderProfile {
  userId: string;
  specialty: string | null;
  subSpecialty: string | null;
  bio: string | null;
  licenceNumber: string | null;
  licenceBody: string | null;
  yearsExperience: number;
  languages: string[];
  qualifications: string[];
  services: string[];
  consultationFeeKes: number | null;
  homeVisitFeeKes: number | null;
  county: string | null;
  town: string | null;
  verificationStatus: "unverified" | "pending" | "in_review" | "verified" | "rejected";
  isAvailable: boolean;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}
