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
  VendorOrdersQuery,
  PatchAppointmentInput,
  PatchConsultationInput,
  PatchHomeVisitInput,
  PatchVendorOrderInput,
  PatchPatientProfileInput,
  PatchProviderProfileInput,
  PaymentsQuery,
  SubmitTillInput,
  TillVerificationList,
  VerifyTillInput,
  DrugsQuery,
  StorefrontQuery,
  OffersQuery,
  ProvidersQuery,
  PublicUser,
  RegisterInput,
  ProviderApplicationInput,
  ReviewVerificationInput,
  SendMessageInput,
  SlotsQuery,
  VerificationsQuery,
  CreateReviewInput,
  ModerateReviewInput,
  ReviewsQuery,
  SymptomCheckInput,
  CreateDrugInput,
  UpdateDrugInput,
  CreateListingInput,
  PatchListingInput,
  VendorApplicationInput,
  PatchOrgInput,
  CreateBranchInput,
  PatchBranchInput,
  InviteMemberInput,
  OrgsQuery,
  ReviewOrgInput,
  CreateAmbulanceRequestInput,
  AcceptAmbulanceRequestInput,
  PatchAmbulanceRequestInput,
  AmbulanceRequestsQuery,
  VendorAmbulanceQueueQuery,
  CreateAmbulanceInput,
  PatchAmbulanceInput,
  CreateAllergyInput,
  PatchAllergyInput,
  CreateConditionInput,
  PatchConditionInput,
  CreateMedicationEntryInput,
  PatchMedicationEntryInput,
  CreateVitalSignInput,
  CreateImmunizationInput,
  CreateMedicalDocumentInput,
  GrantAccessInput,
  CreateLabTestInput,
  PatchLabTestInput,
  LabTestsQuery,
  CreateLabOrderInput,
  PatchLabOrderInput,
  LabOrdersQuery,
  EnterLabResultInput,
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
  /** Apply as a healthcare provider (creates a pending profile for admin review). */
  applyAsProvider(input: ProviderApplicationInput) {
    return this.post<AuthResult>("/providers/apply", input);
  }
  /** Apply as a marketplace vendor business — pharmacy, ambulance operator, or lab. */
  applyAsVendor(input: VendorApplicationInput) {
    return this.post<AuthResult>("/vendors/apply", input);
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

  /** URL for the consultation's treatment sheet / cardex / assessment PDF. */
  treatmentSheetPdfUrl(consultationId: string) {
    return `${this.opts.baseUrl}/consultations/${consultationId}/pdf`;
  }

  /** The calling patient's medical history (past consultations + notes + prescriptions). */
  getMedicalHistory() {
    return this.request<{ consultations: MedicalHistoryEntry[] }>("/patients/me/consultations");
  }

  // ── Payments (Jenga / M-Pesa) ──
  initiateMpesaPayment(input: MpesaStkInput) {
    return this.post<PaymentSummary>("/payments/mpesa/stk", input);
  }
  /** Sandbox helper: completes a pending payment by firing a synthetic success outcome. */
  simulateMpesaPayment(gatewayRef: string) {
    return this.post<{ completed: boolean; type: string }>("/payments/mpesa/simulate", { gatewayRef });
  }
  /** Till mode: report the M-Pesa confirmation code for a pending Till payment. */
  submitTillPayment(input: SubmitTillInput) {
    return this.post<{ submitted: boolean }>("/payments/till/submit", input);
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
  /** Admin: sweep Jenga STK payments stuck pending 10+ minutes via the query-status endpoint. */
  adminReconcilePayments() {
    return this.post<{ checked: number; settled: number; failed: number }>("/admin/payments/reconcile", {});
  }

  // ── Storefront (multi-vendor pharmacy, proximity-ranked) ──
  searchDrugs(query?: Partial<StorefrontQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<StorefrontResult>(`/storefront/drugs?${params}`);
  }
  getDrug(drugId: string) {
    return this.request<Drug>(`/storefront/drugs/${drugId}`);
  }
  getDrugOffers(drugId: string, query?: Partial<OffersQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<DrugOffersResult>(`/storefront/drugs/${drugId}/offers?${params}`);
  }
  /** Hydrates a single cart line item — used by the cart panel. */
  getListing(listingId: string) {
    return this.request<Listing & { organization: { id: string; name: string } }>(`/storefront/listings/${listingId}`);
  }
  /** The full canonical catalogue (not filtered to drugs with a listing) — used when a vendor is picking a drug to claim. */
  browseCatalogue(query?: Partial<DrugsQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<DrugListResult>(`/storefront/catalogue?${params}`);
  }

  // ── Orders — a cart may span multiple vendor pharmacies ──
  listOrders(query?: Partial<OrdersQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<OrderListResult>(`/orders?${params}`);
  }
  /** `redirect` is present only under jenga_pgw mode — POST its fields to `actionUrl` to open hosted checkout. */
  createOrder(input: CreateOrderInput) {
    return this.post<Order & { redirect: PgwRedirect | null }>("/orders", input);
  }
  getOrder(orderId: string) {
    return this.request<Order>(`/orders/${orderId}`);
  }
  adminListOrders(query?: Partial<OrdersQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<OrderListResult>(`/admin/orders?${params}`);
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

  // ── Ambulance (request + dispatch) ──
  listAmbulanceRequests(query?: Partial<AmbulanceRequestsQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<AmbulanceRequestListResult>(`/ambulance-requests?${params}`);
  }
  requestAmbulance(input: CreateAmbulanceRequestInput) {
    return this.post<AmbulanceRequest>("/ambulance-requests", input);
  }
  getAmbulanceRequest(requestId: string) {
    return this.request<AmbulanceRequest>(`/ambulance-requests/${requestId}`);
  }
  cancelAmbulanceRequest(requestId: string, cancelReason?: string) {
    return this.patch<AmbulanceRequest>(`/ambulance-requests/${requestId}`, { cancelReason });
  }
  payAmbulanceRequest(requestId: string, phoneNumber: string) {
    return this.post<PaymentSummary>(`/ambulance-requests/${requestId}/pay`, { phoneNumber });
  }

  // ── Vendor — ambulance dispatch ──
  vendorAmbulanceQueue(query?: Partial<VendorAmbulanceQueueQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<{ own: AmbulanceRequest[]; unassigned: AmbulanceRequest[] }>(`/vendor/ambulance-requests?${params}`);
  }
  acceptAmbulanceRequest(requestId: string, input: AcceptAmbulanceRequestInput) {
    return this.post<AmbulanceRequest>(`/vendor/ambulance-requests/${requestId}/accept`, input);
  }
  patchVendorAmbulanceRequest(requestId: string, input: PatchAmbulanceRequestInput) {
    return this.patch<AmbulanceRequest>(`/vendor/ambulance-requests/${requestId}`, input);
  }
  listVendorAmbulances() {
    return this.request<{ ambulances: Ambulance[] }>("/vendor/ambulances");
  }
  createVendorAmbulance(input: CreateAmbulanceInput) {
    return this.post<Ambulance>("/vendor/ambulances", input);
  }
  patchVendorAmbulance(ambulanceId: string, input: PatchAmbulanceInput) {
    return this.patch<Ambulance>(`/vendor/ambulances/${ambulanceId}`, input);
  }

  // ── Medical records (EMR) ──
  getRecord(patientId: string, reason?: string) {
    const params = reason ? `?reason=${encodeURIComponent(reason)}` : "";
    return this.request<PatientRecord>(`/records/${patientId}${params}`);
  }
  addAllergy(patientId: string, input: CreateAllergyInput) {
    return this.post<Allergy>(`/records/${patientId}/allergies`, input);
  }
  patchAllergy(patientId: string, allergyId: string, input: PatchAllergyInput) {
    return this.patch<Allergy>(`/records/${patientId}/allergies/${allergyId}`, input);
  }
  addCondition(patientId: string, input: CreateConditionInput) {
    return this.post<Condition>(`/records/${patientId}/conditions`, input);
  }
  patchCondition(patientId: string, conditionId: string, input: PatchConditionInput) {
    return this.patch<Condition>(`/records/${patientId}/conditions/${conditionId}`, input);
  }
  addMedication(patientId: string, input: CreateMedicationEntryInput) {
    return this.post<MedicationEntry>(`/records/${patientId}/medications`, input);
  }
  patchMedication(patientId: string, entryId: string, input: PatchMedicationEntryInput) {
    return this.patch<MedicationEntry>(`/records/${patientId}/medications/${entryId}`, input);
  }
  addVital(patientId: string, input: CreateVitalSignInput) {
    return this.post<VitalSign>(`/records/${patientId}/vitals`, input);
  }
  addImmunization(patientId: string, input: CreateImmunizationInput) {
    return this.post<Immunization>(`/records/${patientId}/immunizations`, input);
  }
  uploadMedicalDocument(patientId: string, input: CreateMedicalDocumentInput) {
    return this.post<MedicalDocument>(`/records/${patientId}/documents`, input);
  }
  listAccessGrants(patientId: string) {
    return this.request<{ grants: RecordAccessGrant[] }>(`/records/${patientId}/grants`);
  }
  grantAccess(patientId: string, input: GrantAccessInput) {
    return this.post<RecordAccessGrant>(`/records/${patientId}/grants`, input);
  }
  revokeAccess(patientId: string, grantId: string) {
    return this.request<RecordAccessGrant>(`/records/${patientId}/grants/${grantId}`, { method: "DELETE" });
  }
  listAccessLog(patientId: string) {
    return this.request<{ logs: RecordAccessLogEntry[] }>(`/records/${patientId}/access-log`);
  }

  // ── Labs (storefront + orders) ──
  nearbyLabs(query?: { lat?: number; lng?: number; county?: string }) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<{ labs: NearbyLab[] }>(`/storefront/labs?${params}`);
  }
  labTestsFor(orgId: string, query?: Partial<LabTestsQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<{ tests: LabTest[] }>(`/storefront/labs/${orgId}/tests?${params}`);
  }
  listLabOrders(query?: Partial<LabOrdersQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<LabOrderListResult>(`/lab-orders?${params}`);
  }
  createLabOrder(input: CreateLabOrderInput) {
    return this.post<LabOrder>("/lab-orders", input);
  }
  getLabOrder(labOrderId: string) {
    return this.request<LabOrder>(`/lab-orders/${labOrderId}`);
  }

  // ── Vendor — lab test menu + fulfilment ──
  listVendorLabTests() {
    return this.request<{ tests: LabTest[] }>("/vendor/lab-tests");
  }
  createVendorLabTest(input: CreateLabTestInput) {
    return this.post<LabTest>("/vendor/lab-tests", input);
  }
  patchVendorLabTest(testId: string, input: PatchLabTestInput) {
    return this.patch<LabTest>(`/vendor/lab-tests/${testId}`, input);
  }
  listVendorLabOrders(query?: Partial<LabOrdersQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<LabOrderListResult>(`/vendor/lab-orders?${params}`);
  }
  patchVendorLabOrder(labOrderId: string, input: PatchLabOrderInput) {
    return this.patch<LabOrder>(`/vendor/lab-orders/${labOrderId}`, input);
  }
  enterLabResult(itemId: string, input: EnterLabResultInput) {
    return this.post<LabResult>(`/vendor/lab-orders/items/${itemId}/result`, input);
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

  // ── Admin: Till payment verification (interim manual M-Pesa mode) ──
  adminListTillVerifications() {
    return this.request<TillVerificationList>("/admin/payments/verifications");
  }
  adminVerifyTillPayment(input: VerifyTillInput) {
    return this.post<{ id: string; approved: boolean }>("/admin/payments/verifications", input);
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

  // ── Admin — Appointments oversight ──
  adminListAppointments(query?: Partial<AppointmentsQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<AppointmentListResult>(`/admin/appointments?${params}`);
  }

  // ── Admin — Drug catalogue curation ──
  adminListDrugs(query?: Partial<DrugsQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<DrugListResult>(`/admin/drugs?${params}`);
  }
  adminCreateDrug(input: CreateDrugInput) {
    return this.post<Drug>(`/admin/drugs`, input);
  }
  adminUpdateDrug(drugId: string, input: UpdateDrugInput) {
    return this.patch<Drug>(`/admin/drugs/${drugId}`, input);
  }
  adminDeleteDrug(drugId: string) {
    return this.request<{ id: string; isActive: boolean }>(`/admin/drugs/${drugId}`, { method: "DELETE" });
  }

  // ── Vendor — catalogue offers (listings) ──
  listVendorListings() {
    return this.request<{ listings: Listing[] }>("/vendor/listings");
  }
  createVendorListing(input: CreateListingInput) {
    return this.post<Listing>("/vendor/listings", input);
  }
  patchVendorListing(listingId: string, input: PatchListingInput) {
    return this.patch<Listing>(`/vendor/listings/${listingId}`, input);
  }

  // ── Vendor — order fulfilment ──
  listVendorOrders(query?: Partial<VendorOrdersQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<VendorOrderListResult>(`/vendor/orders?${params}`);
  }
  patchVendorOrder(vendorOrderId: string, input: PatchVendorOrderInput) {
    return this.patch<VendorOrder>(`/vendor/orders/${vendorOrderId}`, input);
  }

  // ── Vendor dashboard (org self-service) ──
  getVendorOrg() {
    return this.request<OrganizationDetail>("/vendor/org");
  }
  patchVendorOrg(input: PatchOrgInput) {
    return this.patch<OrganizationDetail>("/vendor/org", input);
  }
  listVendorBranches() {
    return this.request<{ branches: OrgBranch[] }>("/vendor/branches");
  }
  createVendorBranch(input: CreateBranchInput) {
    return this.post<OrgBranch>("/vendor/branches", input);
  }
  patchVendorBranch(branchId: string, input: PatchBranchInput) {
    return this.patch<OrgBranch>(`/vendor/branches/${branchId}`, input);
  }
  listVendorMembers() {
    return this.request<{ members: OrgMemberSummary[] }>("/vendor/members");
  }
  inviteVendorMember(input: InviteMemberInput) {
    return this.post<OrgMemberSummary>("/vendor/members", input);
  }
  removeVendorMember(memberId: string) {
    return this.request<OrgMemberSummary>(`/vendor/members/${memberId}`, { method: "DELETE" });
  }

  // ── Admin — Organizations (vendor businesses) ──
  adminListOrganizations(query?: Partial<OrgsQuery>) {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request<OrganizationListResult>(`/admin/organizations?${params}`);
  }
  adminReviewOrganization(orgId: string, input: ReviewOrgInput) {
    return this.post<OrganizationDetail>(`/admin/organizations/${orgId}/review`, input);
  }

  // ── AI (M9) ──
  symptomCheck(input: SymptomCheckInput) {
    return this.post<SymptomCheckResult>(`/ai/symptom-check`, input);
  }
  matchProvider(concern: string) {
    return this.post<ProviderMatchResult>(`/ai/provider-match`, { concern });
  }
  /** Clinical fact-check for providers (used in the consultation room). */
  factCheck(question: string) {
    return this.post<FactCheckResult>(`/ai/fact-check`, { question });
  }

  // ── Notifications ──
  listNotifications() {
    return this.request<{ notifications: AppNotification[]; unreadCount: number }>(`/notifications`);
  }
  markNotificationRead(notificationId: string) {
    return this.post<{ ok: boolean }>(`/notifications/${notificationId}/read`, {});
  }
  markAllNotificationsRead() {
    return this.post<{ ok: boolean; count: number }>(`/notifications/read-all`, {});
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

// ── Organizations (vendor businesses) ──────────────────────────────────────

export type OrgType = "pharmacy" | "ambulance" | "lab" | "clinic";
export type OrgStatus = "pending" | "in_review" | "approved" | "suspended" | "rejected";
export type OrgMemberRole = "owner" | "manager" | "staff";

export interface OrgBranch {
  id: string;
  orgId: string;
  name: string;
  county: string;
  town: string | null;
  addressLine: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  deliveryRadiusKm: number;
  deliveryFeeKes: number;
  minOrderKes: number;
  opensMinute: number | null;
  closesMinute: number | null;
  isOpen24h: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMemberSummary {
  id: string;
  orgId: string;
  userId: string;
  role: OrgMemberRole;
  isActive: boolean;
  createdAt: string;
  user: { id: string; fullName: string; email: string; avatarUrl?: string | null; isActive?: boolean };
}

export interface Organization {
  id: string;
  type: OrgType;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  licenceNumber: string | null;
  licenceBody: string | null;
  kraPin: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: OrgStatus;
  reviewedAt: string | null;
  reviewNotes: string | null;
  commissionPercent: number | null;
  payoutMethod: string | null;
  payoutAccount: string | null;
  payoutName: string | null;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationDetail extends Organization {
  branches: OrgBranch[];
  members: OrgMemberSummary[];
}

export interface OrganizationListResult {
  organizations: (Organization & { branches: OrgBranch[] })[];
  total: number;
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
  payment?: PaymentSummary | null;
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
  clinicalRecord: Record<string, string> | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Populated by GET /consultations/:id (participant-scoped). */
  appointment?: {
    patientId: string;
    providerId: string;
    appointmentType: AppointmentType;
    status: AppointmentStatus;
  };
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

export type PaymentStatus = "pending" | "awaiting_verification" | "completed" | "failed" | "refunded" | "cancelled";
export type PaymentSubjectType = "appointment" | "order" | "home_visit" | "ambulance" | "lab_order";
export type PaymentGatewayName = "jenga_stk" | "jenga_pgw" | "till" | "mpesa_daraja";

/** The minimal shape attached to appointments/orders/home visits — not the full ledger record. */
export interface PaymentSummary {
  id: string;
  status: PaymentStatus;
  method: "mpesa" | "till";
  gateway: PaymentGatewayName;
  gatewayRef: string;
  amountKes: number;
  receiptNumber: string | null;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
}

/** jenga_pgw hosted checkout — POST `fields` as a form to `actionUrl` to open it. */
export interface PgwRedirect {
  actionUrl: string;
  fields: Record<string, string>;
}

export interface LedgerEntry {
  id: string;
  paymentId: string;
  type: "gross_sale" | "platform_fee" | "vendor_payout" | "provider_payout" | "delivery_fee" | "refund" | "payout_settled";
  orgId: string | null;
  providerId: string | null;
  amountKes: number;
  description: string | null;
  createdAt: string;
}

/** The full payment record — GET /payments and /payments/:id. */
export interface PaymentRecord {
  id: string;
  subjectType: PaymentSubjectType;
  subjectId: string;
  patientId: string;
  providerId: string | null;
  orgId: string | null;
  gateway: PaymentGatewayName;
  method: "mpesa" | "till";
  status: PaymentStatus;
  amountKes: number;
  refundedKes: number;
  currency: string;
  phoneNumber: string;
  gatewayRef: string;
  gatewayTxnRef: string | null;
  receiptNumber: string | null;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient: { id: string; fullName: string; phone: string | null };
  provider: { id: string; fullName: string } | null;
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
  | "awaiting_verification"
  | "paid"
  | "processing"
  | "dispatched"
  | "delivered"
  | "cancelled"
  | "refunded";

// ── Drugs (canonical catalogue) & Listings (a vendor's offer) ───────────────

export interface Drug {
  id: string;
  name: string;
  genericName: string | null;
  description: string | null;
  category: string;
  form: string | null;
  strength: string | null;
  imageUrl: string | null;
  images: string[];
  requiresPrescription: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DrugListResult {
  drugs: Drug[];
  total: number;
  limit: number;
  offset: number;
}

export interface Listing {
  id: string;
  orgId: string;
  drugId: string;
  priceKes: number;
  stockQty: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  drug: Drug;
}

/** One row in the buyer-facing storefront — a drug plus its best/nearest offer. */
export interface StorefrontDrug {
  drugId: string;
  name: string;
  category: string;
  imageUrl: string | null;
  requiresPrescription: boolean;
  bestPriceKes: number;
  vendorCount: number;
  /** The listing surfaced by nearestVendor — "Add to cart" adds this listing directly. */
  listingId: string;
  stockQty: number;
  nearestVendor: {
    orgId: string;
    orgName: string;
    branchName: string;
    county: string;
    distanceKm: number | null;
  };
}

export interface StorefrontResult {
  drugs: StorefrontDrug[];
  total: number;
  limit: number;
  offset: number;
}

export interface DrugOffer {
  listingId: string;
  priceKes: number;
  stockQty: number;
  orgId: string;
  orgName: string;
  branchName: string;
  county: string;
  distanceKm: number | null;
}

export interface DrugOffersResult {
  drug: Drug;
  offers: DrugOffer[];
}

// ── Orders — a checkout, fanned out into one VendorOrder per pharmacy ───────

export interface OrderItem {
  id: string;
  vendorOrderId: string;
  listingId: string;
  drugName: string;
  unitPriceKes: number;
  qty: number;
  listing: { id: string; drug: { id: string; name: string; imageUrl: string | null; category: string } };
}

export interface VendorOrder {
  id: string;
  orderId: string;
  orgId: string;
  branchId: string | null;
  status: OrderStatus;
  subtotalKes: number;
  deliveryFeeKes: number;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  organization: { id: string; name: string; type: string };
  /** Present only on vendor-side listings (GET /vendor/orders), not nested Order fetches. */
  order?: { id: string; deliveryAddress: string; phoneNumber: string; patient: { fullName: string } };
}

export interface VendorOrderListResult {
  vendorOrders: VendorOrder[];
  total: number;
  limit: number;
  offset: number;
}

export interface Order {
  id: string;
  patientId: string;
  prescriptionId: string | null;
  totalKes: number;
  phoneNumber: string;
  deliveryAddress: string;
  deliveryNotes: string | null;
  createdAt: string;
  updatedAt: string;
  vendorOrders: VendorOrder[];
  patient: { id: string; fullName: string; phone: string | null };
  prescription: { id: string; issuedAt: string } | null;
  payment: PaymentSummary | null;
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
  | "awaiting_verification"
  | "assigned"
  | "paid"
  | "en_route"
  | "arrived"
  | "completed"
  | "cancelled";

export type VisitUrgency = "routine" | "urgent" | "emergency";

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
  createdAt: string;
  updatedAt: string;
  patient: { id: string; fullName: string; phone: string | null; avatarUrl: string | null };
  provider: {
    userId: string;
    specialty: string | null;
    homeVisitFeeKes: number | null;
    user: { fullName: string; avatarUrl: string | null; phone: string | null };
  } | null;
  payment: PaymentSummary | null;
}

export interface HomeVisitListResult {
  visits: HomeVisit[];
  total: number;
  limit: number;
  offset: number;
}

// ── Ambulance ────────────────────────────────────────────────────────────────

export type AmbulanceType = "basic" | "advanced_life_support" | "icu" | "neonatal" | "mortuary";
export type AmbulanceRequestStatus =
  | "requested" | "accepted" | "dispatched" | "en_route_pickup" | "arrived_pickup"
  | "en_route_destination" | "completed" | "cancelled";

export interface Ambulance {
  id: string;
  orgId: string;
  branchId: string | null;
  plateNumber: string;
  type: AmbulanceType;
  crewSize: number;
  equipment: string[];
  isActive: boolean;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AmbulanceRequestEvent {
  id: string;
  requestId: string;
  status: AmbulanceRequestStatus;
  note: string | null;
  actorId: string | null;
  at: string;
}

export interface AmbulanceRequest {
  id: string;
  patientId: string;
  requestedById: string;
  orgId: string | null;
  ambulanceId: string | null;
  type: AmbulanceType;
  urgency: VisitUrgency;
  pickupAddress: string;
  pickupCounty: string;
  pickupLatitude: number;
  pickupLongitude: number;
  destinationName: string | null;
  destinationAddress: string | null;
  patientCondition: string;
  contactPhone: string;
  status: AmbulanceRequestStatus;
  estimatedKes: number | null;
  feeKes: number | null;
  acceptedAt: string | null;
  dispatchedAt: string | null;
  arrivedPickupAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  patient: { id: string; fullName: string; phone: string | null };
  organization: { id: string; name: string; contactPhone: string | null } | null;
  ambulance: Ambulance | null;
  events: AmbulanceRequestEvent[];
  payment: PaymentSummary | null;
}

export interface AmbulanceRequestListResult {
  requests: AmbulanceRequest[];
  total: number;
  limit: number;
  offset: number;
}

// ── Medical records (EMR) ────────────────────────────────────────────────────

export type AllergySeverity = "mild" | "moderate" | "severe";
export type ConditionStatus = "active" | "resolved" | "chronic";
export type MedicalDocumentType = "lab_result" | "imaging" | "discharge_summary" | "referral" | "insurance" | "prescription" | "other";

export interface Allergy {
  id: string; patientId: string; substance: string; severity: AllergySeverity;
  reaction: string | null; notedAt: string; isActive: boolean; createdAt: string;
}

export interface Condition {
  id: string; patientId: string; name: string; icd10Code: string | null; status: ConditionStatus;
  diagnosedAt: string | null; notes: string | null; createdAt: string; updatedAt: string;
}

export interface MedicationEntry {
  id: string; patientId: string; prescriptionId: string | null; name: string;
  dosage: string | null; frequency: string | null; startedAt: string | null;
  endedAt: string | null; isActive: boolean; createdAt: string;
}

export interface VitalSign {
  id: string; patientId: string; consultationId: string | null; type: string;
  value: string; unit: string | null; recordedAt: string; recordedById: string | null;
}

export interface Immunization {
  id: string; patientId: string; vaccine: string; doseNumber: number | null;
  administeredAt: string; administeredBy: string | null; nextDueAt: string | null; createdAt: string;
}

export interface MedicalDocument {
  id: string; patientId: string; type: MedicalDocumentType; title: string; fileUrl: string;
  uploadedById: string; consultationId: string | null; createdAt: string;
}

export interface RecordAccessGrant {
  id: string; patientId: string; granteeUserId: string | null; granteeOrgId: string | null;
  scope: string[]; expiresAt: string | null; revokedAt: string | null; createdAt: string;
  granteeUser?: { id: string; fullName: string; email: string; role: string };
}

export interface RecordAccessLogEntry {
  id: string; patientId: string; actorId: string; action: "view" | "denied" | "break_glass";
  reason: string | null; at: string;
  actor: { id: string; fullName: string; role: string };
}

export interface PatientRecord {
  allergies: Allergy[];
  conditions: Condition[];
  medications: MedicationEntry[];
  vitals: VitalSign[];
  immunizations: Immunization[];
  documents: MedicalDocument[];
  consultations: MedicalHistoryEntry[];
}

// ── Labs (diagnostic tests) ──────────────────────────────────────────────────

export type LabOrderStatus = "requested" | "accepted" | "sample_collected" | "processing" | "resulted" | "cancelled";
export type LabResultFlag = "normal" | "high" | "low" | "critical";

export interface NearbyLab {
  orgId: string; orgName: string; branchName: string; county: string; distanceKm: number | null;
}

export interface LabTest {
  id: string; orgId: string; code: string | null; name: string; category: string;
  priceKes: number; turnaroundHours: number | null; sampleType: string | null;
  isActive: boolean; createdAt: string; updatedAt: string;
}

export interface LabResult {
  id: string; labOrderItemId: string; value: string; unit: string | null;
  referenceRange: string | null; flag: LabResultFlag | null; resultedAt: string;
  verifiedById: string | null; documentId: string | null;
}

export interface LabOrderItem {
  id: string; labOrderId: string; labTestId: string; testName: string; priceKes: number;
  labTest: LabTest; result: LabResult | null;
}

export interface LabOrder {
  id: string;
  patientId: string;
  orderedById: string;
  consultationId: string | null;
  orgId: string;
  branchId: string | null;
  status: LabOrderStatus;
  collectionType: string;
  scheduledAt: string | null;
  address: string | null;
  totalKes: number;
  phoneNumber: string | null;
  createdAt: string;
  updatedAt: string;
  patient: { id: string; fullName: string; phone: string | null };
  organization: { id: string; name: string };
  items: LabOrderItem[];
  payment: PaymentSummary | null;
}

export interface LabOrderListResult {
  orders: LabOrder[];
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
  payments: {
    completedCount: number;
    totalRevenueKes: number;
    platformFeeKes: number;
    breakdown?: { consultationsKes: number; pharmacyKes: number; homeVisitsKes: number };
  };
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
  /** Populated by the admin review list. */
  provider?: { userId: string; specialty: string | null; user: { fullName: string; email: string } };
}

export interface ReviewListResult {
  reviews: Review[];
  total: number;
  limit: number;
  offset: number;
}

// ── M9: AI ──────────────────────────────────────────────────────────────────

export interface PharmacySuggestion {
  id: string;
  name: string;
  category: string;
  priceKes: number;
  imageUrl: string | null;
  requiresPrescription: boolean;
}

export interface SymptomCheckResult {
  urgency: "routine" | "urgent" | "emergency";
  recommendedSpecialty: string;
  advice: string;
  seekEmergencyCare: boolean;
  disclaimer: string;
  pharmacySuggestions: PharmacySuggestion[];
}

export interface ProviderMatchResult {
  recommendedSpecialty: string;
  reason: string;
  alternatives: string[];
}

export interface FactCheckResult {
  answer: string;
  disclaimer: string;
  pharmacySuggestions: PharmacySuggestion[];
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}
