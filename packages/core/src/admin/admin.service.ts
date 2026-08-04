import { db, Prisma } from "@carebora/db";
import {
  ApiError,
  type AdminPatchUserInput,
  type AdminUsersQuery,
  type AppointmentsQuery,
  type AuditLogsQuery,
  type ReviewVerificationInput,
  type VerificationsQuery,
  type TillContext,
} from "@carebora/shared";
import { settlementService } from "../payment/settlement.service";

async function writeAuditLog(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
) {
  await db.auditLog.create({
    data: { actorId, action, entityType, entityId, metadata: metadata as Prisma.InputJsonValue ?? Prisma.DbNull },
  });
}

const USER_SUMMARY = {
  id: true,
  role: true,
  email: true,
  phone: true,
  fullName: true,
  avatarUrl: true,
  isActive: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const adminService = {
  // ── User management ───────────────────────────────────────────────────────

  async listUsers(query: AdminUsersQuery) {
    const where: Record<string, unknown> = {};
    if (query.role !== undefined) where.role = query.role;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ];
    }
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: USER_SUMMARY,
        orderBy: { createdAt: "desc" },
        skip: query.offset,
        take: query.limit,
      }),
      db.user.count({ where }),
    ]);
    return { users, total, limit: query.limit, offset: query.offset };
  },

  async getUser(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        ...USER_SUMMARY,
        patientProfile: true,
        providerProfile: true,
        verificationDocuments: { orderBy: { createdAt: "desc" } },
        sessions: {
          where: { revokedAt: null, expiresAt: { gt: new Date() } },
          select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
    if (!user) throw ApiError.notFound("User not found");
    return user;
  },

  async patchUser(targetId: string, actorId: string, input: AdminPatchUserInput) {
    const user = await db.user.findUnique({ where: { id: targetId } });
    if (!user) throw ApiError.notFound("User not found");

    const updated = await db.user.update({
      where: { id: targetId },
      data: {
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
      },
      select: USER_SUMMARY,
    });

    await writeAuditLog(actorId, "admin_patch_user", "user", targetId, input as Record<string, unknown>);
    return updated;
  },

  // ── Provider verification ─────────────────────────────────────────────────

  async listVerifications(query: VerificationsQuery) {
    const where: Record<string, unknown> = {};
    if (query.status) where.verificationStatus = query.status;
    if (query.specialty) where.specialty = { contains: query.specialty, mode: "insensitive" };

    const [providers, total] = await Promise.all([
      db.providerProfile.findMany({
        where,
        include: {
          user: {
            include: { verificationDocuments: { orderBy: { createdAt: "desc" } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: query.offset,
        take: query.limit,
      }),
      db.providerProfile.count({ where }),
    ]);
    return { providers, total, limit: query.limit, offset: query.offset };
  },

  async reviewVerification(providerId: string, reviewerId: string, input: ReviewVerificationInput) {
    const provider = await db.providerProfile.findUnique({ where: { userId: providerId } });
    if (!provider) throw ApiError.notFound("Provider not found");

    // Update profile status
    const updated = await db.providerProfile.update({
      where: { userId: providerId },
      data: { verificationStatus: input.status },
      include: {
        user: {
          include: { verificationDocuments: { orderBy: { createdAt: "desc" }, take: 5 } },
        },
      },
    });

    // Mark the most recent unreviewed document as reviewed (if any)
    const pendingDoc = await db.verificationDocument.findFirst({
      where: { userId: providerId, reviewedById: null },
      orderBy: { createdAt: "desc" },
    });
    if (pendingDoc) {
      await db.verificationDocument.update({
        where: { id: pendingDoc.id },
        data: { reviewedById: reviewerId, reviewedAt: new Date(), notes: input.notes ?? null },
      });
    }

    await writeAuditLog(reviewerId, "provider_verification_reviewed", "provider", providerId, {
      newStatus: input.status,
      notes: input.notes,
    });

    return updated;
  },

  // ── Platform stats ────────────────────────────────────────────────────────

  async getStats() {
    const [
      userGroups,
      appointmentGroups,
      paymentCompleted,
      platformFees,
      orderCount,
      vendorOrderGroups,
      homeVisitGroups,
      revenueBySubject,
    ] = await Promise.all([
      db.user.groupBy({ by: ["role"], _count: { _all: true } }),
      db.appointment.groupBy({ by: ["status"], _count: { _all: true } }),
      db.payment.aggregate({ where: { status: "completed" }, _count: { _all: true }, _sum: { amountKes: true } }),
      db.ledgerEntry.aggregate({ where: { type: "platform_fee" }, _sum: { amountKes: true } }),
      db.order.count(),
      // Fulfilment status lives per vendor slice of a checkout now (a cart can span orgs).
      db.vendorOrder.groupBy({ by: ["status"], _count: { _all: true } }),
      db.homeVisit.groupBy({ by: ["status"], _count: { _all: true } }),
      // Revenue by subject type, straight off the single polymorphic Payment
      // table — every subject (appointment/order/home visit/…) is counted the
      // same way, so a new subject type in a later phase needs no new query here.
      db.payment.groupBy({ by: ["subjectType"], where: { status: "completed" }, _sum: { amountKes: true } }),
    ]);

    const bySubject = Object.fromEntries(revenueBySubject.map((r) => [r.subjectType, r._sum.amountKes ?? 0]));
    const consultationsKes = bySubject.appointment ?? 0;
    const pharmacyKes = bySubject.order ?? 0;
    const homeVisitsKes = bySubject.home_visit ?? 0;

    const toMap = (groups: { _count: { _all: number }; [k: string]: unknown }[], key: string) =>
      Object.fromEntries(groups.map((g) => [g[key] as string, g._count._all]));

    return {
      users: {
        total: userGroups.reduce((s, g) => s + g._count._all, 0),
        byRole: toMap(userGroups, "role"),
      },
      appointments: {
        total: appointmentGroups.reduce((s, g) => s + g._count._all, 0),
        byStatus: toMap(appointmentGroups, "status"),
      },
      payments: {
        completedCount: paymentCompleted._count._all,
        totalRevenueKes: paymentCompleted._sum.amountKes ?? 0,
        platformFeeKes: platformFees._sum.amountKes ?? 0,
        breakdown: {
          consultationsKes,
          pharmacyKes,
          homeVisitsKes,
        },
      },
      orders: {
        total: orderCount,
        byStatus: toMap(vendorOrderGroups, "status"),
      },
      homeVisits: {
        total: homeVisitGroups.reduce((s, g) => s + g._count._all, 0),
        byStatus: toMap(homeVisitGroups, "status"),
      },
    };
  },

  // ── Audit log ─────────────────────────────────────────────────────────────

  async listAuditLogs(query: AuditLogsQuery) {
    const where: Record<string, unknown> = {};
    if (query.actorId) where.actorId = query.actorId;
    if (query.action) where.action = { contains: query.action, mode: "insensitive" };
    if (query.entityType) where.entityType = query.entityType;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, fullName: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: query.offset,
        take: query.limit,
      }),
      db.auditLog.count({ where }),
    ]);
    return { logs, total, limit: query.limit, offset: query.offset };
  },

  /** Platform-wide appointment oversight (every appointment, any provider/patient). */
  async listAppointments(query: AppointmentsQuery) {
    const where = query.status ? { status: query.status } : {};
    const [appointments, total] = await Promise.all([
      db.appointment.findMany({
        where,
        include: {
          slot: { select: { startsAt: true } },
          patient: { select: { id: true, fullName: true } },
          provider: { select: { userId: true, specialty: true, user: { select: { fullName: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: query.offset,
        take: query.limit,
      }),
      db.appointment.count({ where }),
    ]);
    return { appointments, total, limit: query.limit, offset: query.offset };
  },

  // ── Till payment verification (interim manual M-Pesa mode) ──────────────────

  /**
   * All Till payments awaiting admin verification. One query against the
   * polymorphic Payment table now covers every surface (appointment, order,
   * home visit, and future ambulance/lab order) — no more per-table unions.
   */
  async listTillVerifications() {
    const payments = await db.payment.findMany({
      where: { status: "awaiting_verification" },
      include: {
        patient: { select: { fullName: true } },
        provider: { select: { fullName: true } },
      },
      orderBy: { updatedAt: "asc" },
    });

    const bySubject = new Map<string, string[]>();
    for (const p of payments) {
      const list = bySubject.get(p.subjectType) ?? [];
      list.push(p.subjectId);
      bySubject.set(p.subjectType, list);
    }
    const [orders, visits] = await Promise.all([
      db.order.findMany({
        where: { id: { in: bySubject.get("order") ?? [] } },
        include: { vendorOrders: { include: { items: { select: { qty: true } } } } },
      }),
      db.homeVisit.findMany({ where: { id: { in: bySubject.get("home_visit") ?? [] } } }),
    ]);
    const orderMap = new Map(orders.map((o) => [o.id, o]));
    const visitMap = new Map(visits.map((v) => [v.id, v]));

    const items = payments.map((p) => {
      let description = `${p.subjectType.replace("_", " ")} payment`;
      if (p.subjectType === "appointment") {
        description = `Consultation with ${p.provider?.fullName ?? "provider"}`;
      } else if (p.subjectType === "order") {
        const order = orderMap.get(p.subjectId);
        const itemCount = order?.vendorOrders.reduce((n, vo) => n + vo.items.reduce((m, i) => m + i.qty, 0), 0) ?? 0;
        description = `Pharmacy order · ${itemCount} item(s)`;
      } else if (p.subjectType === "home_visit") {
        const visit = visitMap.get(p.subjectId);
        description = `Home visit · ${visit?.specialty ?? ""}`;
      }
      return {
        context: p.subjectType as TillContext,
        id: p.id,
        code: p.receiptNumber ?? "",
        amountKes: p.amountKes,
        phone: p.phoneNumber,
        patientName: p.patient.fullName,
        description,
        submittedAt: p.updatedAt,
      };
    });

    return { items, total: items.length };
  },

  /** Approve or reject a Till payment (by Payment id), with an audit trail. */
  async verifyTillPayment(id: string, approve: boolean, actorId: string) {
    const payment = await settlementService.verifyTill(id, approve);
    await writeAuditLog(
      actorId,
      approve ? "till_payment_approved" : "till_payment_rejected",
      payment.subjectType,
      payment.subjectId,
    );
    return { id, approved: approve };
  },
};
