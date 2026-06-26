import type {
  AdminPatchUserInput,
  AdminUsersQuery,
  ApiResult,
  AppointmentsQuery,
  AssignHomeVisitInput,
  AuditLogsQuery,
  AuthResult,
  CreateAppointmentInput,
  CreateAvailabilityInput,
  CreateHomeVisitInput,
  CreateOrderInput,
  CreatePrescriptionInput,
  CreateSlotInput,
  HomeVisitStkInput,
  HomeVisitsQuery,
  LoginInput,
  MpesaStkInput,
  OrdersQuery,
  PatchAppointmentInput,
  PatchConsultationInput,
  PatchHomeVisitInput,
  PatchOrderInput,
  PatchPatientProfileInput,
  PatchProviderProfileInput,
  PaymentsQuery,
  ProductsQuery,
  ProvidersQuery,
  PublicUser,
  RegisterInput,
  ReviewVerificationInput,
  SendMessageInput,
  SlotsQuery,
  VerificationsQuery,
  CreateReviewInput,
  ModerateReviewInput,
  ReviewsQuery,
  SymptomCheckInput,
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

  /** The calling patient's medical history (past consultations + notes + prescriptions). */
  getMedicalHistory() {
    return this.request<{ consultations: MedicalHistoryEntry[] }>("/patients/me/consultations");
  }

  // ── Payments / M-Pesa (M4) ──
  initiateMpesaPayment(input: MpesaStkInput) {
    return this.post<PaymentRecord>("/payments/mpesa/stk", input);
  }
  listPayments(query?: Partial<PaymentsQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<PaymentListResult>(`/payments?${params}`);
  }
  getPayment(paymentId: string) {
    return this.request<PaymentRecord>(`/payments/${paymentId}`);
  }
  refundPayment(paymentId: string) {
    return this.post<PaymentRecord>(`/payments/${paymentId}/refund`, {});
  }

  // ── Products / Pharmacy (M5) ──
  listProducts(query?: Partial<ProductsQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<ProductListResult>(`/products?${params}`);
  }
  getProduct(productId: string) {
    return this.request<Product>(`/products/${productId}`);
  }

  // ── Orders (M5) ──
  listOrders(query?: Partial<OrdersQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<OrderListResult>(`/orders?${params}`);
  }
  createOrder(input: CreateOrderInput) {
    return this.post<Order>("/orders", input);
  }
  getOrder(orderId: string) {
    return this.request<Order>(`/orders/${orderId}`);
  }
  patchOrder(orderId: string, input: PatchOrderInput) {
    return this.patch<Order>(`/orders/${orderId}`, input);
  }

  // ── Home-Based Care (M6) ──
  listHomeVisits(query?: Partial<HomeVisitsQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<HomeVisitListResult>(`/home-visits?${params}`);
  }
  requestHomeVisit(input: CreateHomeVisitInput) {
    return this.post<HomeVisit>("/home-visits", input);
  }
  getHomeVisit(visitId: string) {
    return this.request<HomeVisit>(`/home-visits/${visitId}`);
  }
  assignHomeVisit(visitId: string, input: AssignHomeVisitInput) {
    return this.post<HomeVisit>(`/home-visits/${visitId}/assign`, input);
  }
  payHomeVisit(visitId: string, input: HomeVisitStkInput) {
    return this.post<HomeVisit>(`/home-visits/${visitId}/pay`, input);
  }
  patchHomeVisit(visitId: string, input: PatchHomeVisitInput) {
    return this.patch<HomeVisit>(`/home-visits/${visitId}`, input);
  }

  // ── Admin — Users (M7) ──
  adminListUsers(query?: Partial<AdminUsersQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<AdminUserListResult>(`/admin/users?${params}`);
  }
  adminGetUser(userId: string) {
    return this.request<AdminUserDetail>(`/admin/users/${userId}`);
  }
  adminPatchUser(userId: string, input: AdminPatchUserInput) {
    return this.patch<AdminUserSummary>(`/admin/users/${userId}`, input);
  }

  // ── Admin — Verifications (M7) ──
  adminListVerifications(query?: Partial<VerificationsQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<VerificationListResult>(`/admin/verifications?${params}`);
  }
  adminReviewVerification(userId: string, input: ReviewVerificationInput) {
    return this.post<VerificationReviewResult>(`/admin/verifications/${userId}/review`, input);
  }

  // ── Admin — Stats & Audit (M7) ──
  adminGetStats() {
    return this.request<PlatformStats>("/admin/stats");
  }
  adminListAuditLogs(query?: Partial<AuditLogsQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<AuditLogListResult>(`/admin/audit-logs?${params}`);
  }

  // ── Reviews (M9) ──
  createReview(appointmentId: string, input: CreateReviewInput) {
    return this.post<Review>(`/appointments/${appointmentId}/review`, input);
  }
  listProviderReviews(providerId: string, query?: Partial<ReviewsQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<ReviewListResult>(`/providers/${providerId}/reviews?${params}`);
  }
  adminListReviews(query?: Partial<ReviewsQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<ReviewListResult>(`/admin/reviews?${params}`);
  }
  adminModerateReview(reviewId: string, input: ModerateReviewInput) {
    return this.patch<Review>(`/admin/reviews/${reviewId}`, input);
  }

  // ── AI (M9) ──
  symptomCheck(input: SymptomCheckInput) {
    return this.post<SymptomCheckResult>(`/ai/symptom-check`, input);
  }
  matchProvider(concern: string) {
    return this.post<ProviderMatchResult>(`/ai/provider-match`, { concern });
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

export interface MedicalHistoryEntry {
  id: string;
  status: ConsultationStatus;
  clinicalNotes: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  appointment: {
    id: string;
    appointmentType: AppointmentType;
    slot: { startsAt: string } | null;
    provider: { userId: string; specialty: string | null; user: { fullName: string } };
  };
  prescriptions: Array<{
    id: string;
    medications: MedicationRecord[];
    instructions: string | null;
    issuedAt: string;
  }>;
}

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded" | "cancelled";

export interface LedgerEntry {
  id: string;
  paymentId: string;
  type: "platform_fee" | "provider_payout" | "refund";
  amountKes: number;
  description: string | null;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  providerId: string;
  method: "mpesa";
  status: PaymentStatus;
  amountKes: number;
  phoneNumber: string;
  checkoutRequestId: string | null;
  merchantRequestId: string | null;
  mpesaReceiptNumber: string | null;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  appointment: {
    id: string;
    appointmentType: AppointmentType;
    status: AppointmentStatus;
    slot: { startsAt: string; endsAt: string };
  };
  patient: { id: string; fullName: string; phone: string | null };
  provider: { id: string; fullName: string };
  ledgerEntries: LedgerEntry[];
}

export interface PaymentListResult {
  payments: PaymentRecord[];
  total: number;
  limit: number;
  offset: number;
}

// ── M5: Pharmacy ────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "dispatched"
  | "delivered"
  | "cancelled";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  priceKes: number;
  stockQty: number;
  requiresPrescription: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResult {
  products: Product[];
  total: number;
  limit: number;
  offset: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  unitPriceKes: number;
  qty: number;
  product: { id: string; name: string; imageUrl: string | null; category: string };
}

export interface Order {
  id: string;
  patientId: string;
  prescriptionId: string | null;
  status: OrderStatus;
  totalKes: number;
  phoneNumber: string;
  deliveryAddress: string;
  deliveryNotes: string | null;
  checkoutRequestId: string | null;
  merchantRequestId: string | null;
  mpesaReceiptNumber: string | null;
  failureReason: string | null;
  paidAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  patient: { id: string; fullName: string; phone: string | null };
  prescription: { id: string; issuedAt: string } | null;
}

export interface OrderListResult {
  orders: Order[];
  total: number;
  limit: number;
  offset: number;
}

// ── M6: Home-Based Care ──────────────────────────────────────────────────────

export type HomeVisitStatus =
  | "pending"
  | "assigned"
  | "paid"
  | "en_route"
  | "arrived"
  | "completed"
  | "cancelled";

export type VisitUrgency = "routine" | "urgent";

export interface HomeVisit {
  id: string;
  patientId: string;
  providerId: string | null;
  specialty: string;
  urgency: VisitUrgency;
  description: string;
  address: string;
  county: string;
  scheduledAt: string | null;
  status: HomeVisitStatus;
  feeKes: number | null;
  visitNotes: string | null;
  assignedAt: string | null;
  enRouteAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  phoneNumber: string | null;
  checkoutRequestId: string | null;
  mpesaReceiptNumber: string | null;
  paymentFailReason: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient: { id: string; fullName: string; phone: string | null; avatarUrl: string | null };
  provider: {
    userId: string;
    specialty: string | null;
    homeVisitFeeKes: number | null;
    user: { fullName: string; avatarUrl: string | null; phone: string | null };
  } | null;
}

export interface HomeVisitListResult {
  visits: HomeVisit[];
  total: number;
  limit: number;
  offset: number;
}

// ── M7: Admin & Operations ───────────────────────────────────────────────────

export interface AdminUserSummary {
  id: string;
  role: string;
  email: string;
  phone: string | null;
  fullName: string;
  avatarUrl: string | null;
  isActive: boolean;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationDocument {
  id: string;
  userId: string;
  type: string;
  fileUrl: string;
  reviewedById: string | null;
  reviewedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserSummary {
  patientProfile: PatientProfile | null;
  providerProfile: ProviderProfile | null;
  verificationDocuments: VerificationDocument[];
  sessions: Array<{
    id: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: string;
    expiresAt: string;
  }>;
}

export interface AdminUserListResult {
  users: AdminUserSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface VerificationProvider {
  userId: string;
  specialty: string | null;
  verificationStatus: string;
  licenceNumber: string | null;
  yearsExperience: number;
  createdAt: string;
  updatedAt: string;
  user: { id: string; fullName: string; email: string; phone: string | null; avatarUrl: string | null; createdAt: string };
  verificationDocuments: VerificationDocument[];
}

export interface VerificationListResult {
  providers: VerificationProvider[];
  total: number;
  limit: number;
  offset: number;
}

export interface VerificationReviewResult {
  userId: string;
  verificationStatus: string;
  user: { id: string; fullName: string; email: string };
  verificationDocuments: VerificationDocument[];
}

export interface PlatformStats {
  users: { total: number; byRole: Record<string, number> };
  appointments: { total: number; byStatus: Record<string, number> };
  payments: { completedCount: number; totalRevenueKes: number; platformFeeKes: number };
  orders: { total: number; byStatus: Record<string, number> };
  homeVisits: { total: number; byStatus: Record<string, number> };
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; fullName: string; email: string; role: string } | null;
}

export interface AuditLogListResult {
  logs: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

// ── M9: Reviews ─────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  appointmentId: string;
  patientId: string;
  providerId: string;
  rating: number;
  comment: string | null;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  patient: { id: string; fullName: string; avatarUrl: string | null };
  appointment: { id: string; appointmentType: string; slot: { startsAt: string } | null } | null;
}

export interface ReviewListResult {
  reviews: Review[];
  total: number;
  limit: number;
  offset: number;
}

// ── M9: AI ──────────────────────────────────────────────────────────────────

export interface SymptomCheckResult {
  urgency: "routine" | "urgent" | "emergency";
  recommendedSpecialty: string;
  advice: string;
  seekEmergencyCare: boolean;
  disclaimer: string;
}

export interface ProviderMatchResult {
  recommendedSpecialty: string;
  reason: string;
  alternatives: string[];
}
