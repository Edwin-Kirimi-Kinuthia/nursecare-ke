import type {
  ApiResult,
  AppointmentsQuery,
  AuthResult,
  CreateAppointmentInput,
  CreateAvailabilityInput,
  CreatePrescriptionInput,
  CreateSlotInput,
  LoginInput,
  PatchAppointmentInput,
  PatchConsultationInput,
  PatchPatientProfileInput,
  PatchProviderProfileInput,
  ProvidersQuery,
  PublicUser,
  RegisterInput,
  SendMessageInput,
  SlotsQuery,
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

  // ── Provider directory (M2) ──
  listProviders(query?: Partial<ProvidersQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<ProviderListResult>(`/providers?${params}`);
  }
  getProvider(providerId: string) {
    return this.request<ProviderPublicProfile>(`/providers/${providerId}`);
  }

  // ── Availability (M2) ──
  listAvailability(providerId: string) {
    return this.request<AvailabilityRule[]>(`/providers/${providerId}/availability`);
  }
  createAvailability(providerId: string, input: CreateAvailabilityInput) {
    return this.post<AvailabilityRule>(`/providers/${providerId}/availability`, input);
  }
  listSlots(providerId: string, query?: Partial<SlotsQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<Slot[]>(`/providers/${providerId}/slots?${params}`);
  }
  createSlot(providerId: string, input: CreateSlotInput) {
    return this.post<Slot>(`/providers/${providerId}/slots`, input);
  }

  // ── Appointments (M2) ──
  listAppointments(query?: Partial<AppointmentsQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<AppointmentListResult>(`/appointments?${params}`);
  }
  createAppointment(input: CreateAppointmentInput) {
    return this.post<Appointment>("/appointments", input);
  }
  getAppointment(appointmentId: string) {
    return this.request<Appointment>(`/appointments/${appointmentId}`);
  }
  patchAppointment(appointmentId: string, input: PatchAppointmentInput) {
    return this.patch<Appointment>(`/appointments/${appointmentId}`, input);
  }

  // ── Consultations (M3) ──
  startConsultation(appointmentId: string) {
    return this.post<Consultation>(`/appointments/${appointmentId}/consultation`, {});
  }
  getConsultation(consultationId: string) {
    return this.request<Consultation>(`/consultations/${consultationId}`);
  }
  patchConsultation(consultationId: string, input: PatchConsultationInput) {
    return this.patch<Consultation>(`/consultations/${consultationId}`, input);
  }
  getLivekitToken(consultationId: string, displayName?: string) {
    return this.post<LivekitTokenResult>(`/consultations/${consultationId}/token`, { displayName });
  }
  listMessages(consultationId: string) {
    return this.request<Message[]>(`/consultations/${consultationId}/messages`);
  }
  sendMessage(consultationId: string, input: SendMessageInput) {
    return this.post<Message>(`/consultations/${consultationId}/messages`, input);
  }

  // ── Prescriptions (M3) ──
  listPrescriptions(consultationId: string) {
    return this.request<RxRecord[]>(`/consultations/${consultationId}/prescriptions`);
  }
  createPrescription(consultationId: string, input: CreatePrescriptionInput) {
    return this.post<RxRecord>(`/consultations/${consultationId}/prescriptions`, input);
  }
  /** Returns the PDF URL for direct browser navigation / download. */
  prescriptionPdfUrl(consultationId: string, prescriptionId: string) {
    return `${this.opts.baseUrl}/consultations/${consultationId}/prescriptions/${prescriptionId}/pdf`;
  }
}

export function createClient(opts: ClientOptions) {
  return new CareBoraClient(opts);
}

// ── Response types ─────────────────────────────────────────────────────────

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

export type AppointmentType = "teleconsult" | "home_visit";
export type AppointmentStatus = "requested" | "confirmed" | "completed" | "cancelled" | "no_show";
export type VerificationStatus = "unverified" | "pending" | "in_review" | "verified" | "rejected";

export interface ProviderPublicProfile extends ProviderProfile {
  user: { id: string; fullName: string; avatarUrl: string | null; role: string };
}

export interface ProviderListResult {
  providers: ProviderPublicProfile[];
  total: number;
  limit: number;
  offset: number;
}

export interface AvailabilityRule {
  id: string;
  providerId: string;
  appointmentType: AppointmentType;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  slotDuration: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Slot {
  id: string;
  providerId: string;
  availabilityId: string | null;
  appointmentType: AppointmentType;
  startsAt: string;
  endsAt: string;
  isBooked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  slotId: string;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  feeKes: number;
  patientNotes: string | null;
  notes: string | null;
  paymentId: string | null;
  createdAt: string;
  updatedAt: string;
  slot: Slot;
  provider: {
    userId: string;
    specialty: string | null;
    consultationFeeKes: number | null;
    homeVisitFeeKes: number | null;
    user: { fullName: string; avatarUrl: string | null };
  };
  patient: { id: string; fullName: string; avatarUrl: string | null };
  consultation?: Consultation | null;
}

export interface AppointmentListResult {
  appointments: Appointment[];
  total: number;
  limit: number;
  offset: number;
}

export type ConsultationStatus = "pending" | "active" | "ended";

export interface Consultation {
  id: string;
  appointmentId: string;
  roomName: string;
  status: ConsultationStatus;
  clinicalNotes: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LivekitTokenResult {
  token: string;
  roomName: string;
  livekitUrl: string;
}

export interface Message {
  id: string;
  consultationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { id: string; fullName: string; avatarUrl: string | null };
}

export interface MedicationRecord {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface RxRecord {
  id: string;
  consultationId: string;
  patientId: string;
  providerId: string;
  medications: MedicationRecord[];
  instructions: string | null;
  fileUrl: string | null;
  issuedAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  provider: { id: string; fullName: string };
  patient: { id: string; fullName: string };
}
