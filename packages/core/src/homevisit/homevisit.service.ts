import { db } from "@carebora/db";
import {
  ApiError,
  type AssignHomeVisitInput,
  type CreateHomeVisitInput,
  type HomeVisitStkInput,
  type HomeVisitsQuery,
  type PatchHomeVisitInput,
  type UserRole,
} from "@carebora/shared";
import { paymentService, toPaymentSummary } from "../payment/payment.service";
import { notificationService } from "../notifications/notification.service";

const VISIT_INCLUDE = {
  patient: { select: { id: true, fullName: true, phone: true, avatarUrl: true } },
  provider: {
    select: {
      userId: true,
      specialty: true,
      homeVisitFeeKes: true,
      user: { select: { fullName: true, avatarUrl: true, phone: true } },
    },
  },
} as const;

function canView(visit: { patientId: string; providerId: string | null }, userId: string, role: UserRole) {
  if (role === "admin") return true;
  if (visit.patientId === userId) return true;
  if (visit.providerId === userId) return true;
  return false;
}

async function attachPayment<T extends { id: string }>(visit: T) {
  const payment = await paymentService.getForSubject("home_visit", visit.id);
  return { ...visit, payment };
}

async function attachPayments<T extends { id: string }>(visits: T[]) {
  const payments = await paymentService.getForSubjects("home_visit", visits.map((v) => v.id));
  return visits.map((v) => ({ ...v, payment: payments.get(v.id) ?? null }));
}

export const homeVisitService = {
  async request(patientId: string, input: CreateHomeVisitInput) {
    return db.homeVisit.create({
      data: {
        patientId,
        specialty: input.specialty,
        urgency: input.urgency ?? "routine",
        description: input.description,
        address: input.address,
        county: input.county,
        contactPhone: input.contactPhone,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      },
      include: VISIT_INCLUDE,
    });
  },

  async list(userId: string, role: UserRole, query: HomeVisitsQuery) {
    const where: Record<string, unknown> = {};
    if (role !== "admin") {
      if (role === "patient") {
        where.patientId = userId;
      } else {
        // provider roles see their own assigned visits
        where.providerId = userId;
      }
    }
    if (query.status) where.status = query.status;
    if (query.specialty) where.specialty = query.specialty;
    if (query.urgency) where.urgency = query.urgency;

    const [visits, total] = await Promise.all([
      db.homeVisit.findMany({
        where,
        include: VISIT_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: query.offset,
        take: query.limit,
      }),
      db.homeVisit.count({ where }),
    ]);
    return { visits: await attachPayments(visits), total, limit: query.limit, offset: query.offset };
  },

  async getById(visitId: string, userId: string, role: UserRole) {
    const visit = await db.homeVisit.findUnique({ where: { id: visitId }, include: VISIT_INCLUDE });
    if (!visit) throw ApiError.notFound("Home visit not found");
    if (!canView(visit, userId, role)) throw ApiError.forbidden();
    return attachPayment(visit);
  },

  /** Admin assigns a provider and sets the fee. Moves status to 'assigned'. */
  async assign(visitId: string, role: UserRole, input: AssignHomeVisitInput) {
    if (role !== "admin") throw ApiError.forbidden();
    const visit = await db.homeVisit.findUnique({ where: { id: visitId } });
    if (!visit) throw ApiError.notFound("Home visit not found");
    if (visit.status !== "pending") throw ApiError.badRequest("Only pending visits can be assigned");

    const provider = await db.providerProfile.findUnique({ where: { userId: input.providerId } });
    if (!provider) throw ApiError.notFound("Provider not found");

    const updated = await db.homeVisit.update({
      where: { id: visitId },
      data: {
        providerId: input.providerId,
        feeKes: input.feeKes,
        scheduledAt: new Date(input.scheduledAt),
        status: "assigned",
        assignedAt: new Date(),
      },
      include: {
        ...VISIT_INCLUDE,
        patient: { select: { id: true, fullName: true, phone: true, avatarUrl: true, email: true } },
      },
    });
    void notificationService.homeVisitAssigned({
      patientEmail: updated.patient.email,
      patientPhone: updated.patient.phone,
      patientName: updated.patient.fullName,
      providerName: updated.provider?.user.fullName ?? "Provider",
      scheduledAt: updated.scheduledAt,
      feeKes: updated.feeKes ?? 0,
    });
    return updated;
  },

  /** Patient initiates payment after the visit has been assigned and priced. */
  async initiateMpesa(visitId: string, patientId: string, input: HomeVisitStkInput) {
    const visit = await db.homeVisit.findUnique({ where: { id: visitId } });
    if (!visit) throw ApiError.notFound("Home visit not found");
    if (visit.patientId !== patientId) throw ApiError.forbidden();
    if (visit.status !== "assigned") {
      throw ApiError.badRequest("Visit must be assigned and priced before payment");
    }
    if (!visit.feeKes) throw ApiError.badRequest("Fee has not been set for this visit");

    const patient = await db.user.findUniqueOrThrow({ where: { id: patientId } });
    const { payment } = await paymentService.initiate({
      subjectType: "home_visit",
      subjectId: visit.id,
      patientId,
      providerId: visit.providerId,
      patientName: patient.fullName,
      patientEmail: patient.email,
      amountKes: visit.feeKes,
      phoneNumber: input.phoneNumber,
      description: "CareBora home visit payment",
      refPrefix: "HV",
    });

    const updated = await db.homeVisit.update({
      where: { id: visitId },
      data: { phoneNumber: input.phoneNumber },
      include: VISIT_INCLUDE,
    });
    return { ...updated, payment: toPaymentSummary(payment) };
  },

  /** Called by the settlement dispatcher once the visit's Payment is marked `completed`. */
  async onPaymentSettled(visitId: string) {
    const visit = await db.homeVisit.findUnique({ where: { id: visitId } });
    if (!visit || visit.status !== "assigned") return;
    await db.homeVisit.update({ where: { id: visitId }, data: { status: "paid" } });
  },

  /** Admin decision on a Till home visit. Approve → paid (via settlement). Reject → back to assigned. */
  async verifyTillReject(visitId: string) {
    const visit = await db.homeVisit.findUnique({ where: { id: visitId } });
    if (!visit) throw ApiError.notFound("Home visit not found");
    if (visit.status !== "awaiting_verification") {
      throw ApiError.badRequest("This visit is not awaiting verification");
    }
    return db.homeVisit.update({ where: { id: visitId }, data: { status: "assigned" }, include: VISIT_INCLUDE });
  },

  /**
   * Update visit status or notes.
   * Providers: en_route (from paid) → arrived → completed; can add visitNotes.
   * Patients: cancel only (pending or assigned).
   * Admin: cancel from any non-completed state.
   */
  async patch(visitId: string, userId: string, role: UserRole, input: PatchHomeVisitInput) {
    const visit = await db.homeVisit.findUnique({ where: { id: visitId } });
    if (!visit) throw ApiError.notFound("Home visit not found");
    if (!canView(visit, userId, role)) throw ApiError.forbidden();

    const isAdmin = role === "admin";
    const isProvider = visit.providerId === userId;
    const isPatient = visit.patientId === userId;

    const data: Record<string, unknown> = {};

    if (input.visitNotes !== undefined) {
      if (!isProvider && !isAdmin) throw ApiError.forbidden("Only the assigned provider can add visit notes");
      data.visitNotes = input.visitNotes;
    }

    if (input.status) {
      const s = input.status;

      if (s === "cancelled") {
        if (!isAdmin && !isPatient) throw ApiError.forbidden();
        if (["completed", "en_route", "arrived"].includes(visit.status)) {
          throw ApiError.badRequest("Cannot cancel a visit that is already underway or completed");
        }
        data.status = "cancelled";
        data.cancelledAt = new Date();
      } else if (s === "en_route") {
        if (!isProvider && !isAdmin) throw ApiError.forbidden();
        if (visit.status !== "paid") throw ApiError.badRequest("Visit must be paid before going en route");
        data.status = "en_route";
        data.enRouteAt = new Date();
      } else if (s === "arrived") {
        if (!isProvider && !isAdmin) throw ApiError.forbidden();
        if (visit.status !== "en_route") throw ApiError.badRequest("Visit must be en route before marking arrived");
        data.status = "arrived";
        data.arrivedAt = new Date();
      } else if (s === "completed") {
        if (!isProvider && !isAdmin) throw ApiError.forbidden();
        if (visit.status !== "arrived") throw ApiError.badRequest("Visit must be arrived before marking completed");
        data.status = "completed";
        data.completedAt = new Date();
      }
    }

    if (Object.keys(data).length === 0) throw ApiError.badRequest("Nothing to update");

    const updated = await db.homeVisit.update({ where: { id: visitId }, data, include: VISIT_INCLUDE });
    return attachPayment(updated);
  },
};
