import { availabilityService } from "../booking/availability.service";
import { db, Prisma } from "@carebora/db";
import {
  ApiError,
  type AdminPatchUserInput,
  type AdminCreateProviderInput,
  type AdminUsersQuery,
  type AppointmentsQuery,
  type AuditLogsQuery,
  type ReviewVerificationInput,
  type VerificationsQuery,
  type TillContext,
  type UserRole,
} from "@carebora/shared";
import { settlementService } from "../payment/settlement.service";
import { toPublicUser, issuePasswordInvite } from "../auth/auth.service";
import { deleteAccountAsAdmin } from "../auth/account-deletion";
import { putFile } from "../storage/storage";

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
    const where: Record<string, unknown> = { deletedAt: null };
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
      where: { id: userId, deletedAt: null },
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
    if (!user || user.deletedAt) throw ApiError.notFound("User not found");

    let avatarUrl = input.avatarUrl;
    if (typeof avatarUrl === "string" && avatarUrl.startsWith("data:")) {
      avatarUrl = (await putFile("avatar", avatarUrl)).url;
    }

    const updated = await db.user.update({
      where: { id: targetId },
      data: {
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone === "" ? null : input.phone } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(input.phone !== undefined && input.phone !== user.phone ? { phoneVerifiedAt: null } : {}),
      },
      select: USER_SUMMARY,
    });

    if (input.isActive === false) {
      await db.session.deleteMany({ where: { userId: targetId } });
      await db.verificationCode.deleteMany({ where: { userId: targetId, channel: "login_otp" } });
    }

    // Clinical fields, only where there is a provider profile to put them on —
    // an admin fixing a licence number or specialty during verification.
    if (input.providerProfile && Object.keys(input.providerProfile).length > 0) {
      const profile = await db.providerProfile.findUnique({ where: { userId: targetId } });
      if (!profile) throw ApiError.badRequest("This account has no provider profile");
      await db.providerProfile.update({ where: { userId: targetId }, data: input.providerProfile });
      // Setting a fee or verifying someone is what makes them bookable, so open
      // their calendar now (a no-op unless they are verified with a fee).
      await availabilityService.ensureSchedule(targetId);
    }

    await writeAuditLog(actorId, "admin_patch_user", "user", targetId, input as Record<string, unknown>);
    return updated;
  },

  /** Close an account at its holder's request, preserving linked care and payment records. */
  async deleteUser(targetId: string, actorId: string) {
    return deleteAccountAsAdmin(targetId, actorId);
  },

  /**
   * Recruit a provider directly, skipping the public apply-and-review queue —
   * for when the admin has already vetted them outside the app. Creates the
   * account pre-verified and emails an invite link to set a password.
   */
  async createProviderAccount(actorId: string, input: AdminCreateProviderInput) {
    const role = input.role as UserRole;
    const avatar = input.avatarUrl ? await putFile("avatar", input.avatarUrl) : null;
    const licenceDoc = input.licenceDocumentUrl ? await putFile("verification_document", input.licenceDocumentUrl) : null;

    let user;
    try {
      user = await db.user.create({
        data: {
          email: input.email,
          fullName: input.fullName,
          phone: input.phone ?? null,
          role,
          avatarUrl: avatar?.url,
          providerProfile: {
            create: {
              specialty: input.specialty ?? null,
              licenceNumber: input.licenceNumber ?? null,
              verificationStatus: "verified",
            },
          },
          ...(licenceDoc && {
            verificationDocuments: { create: { type: "practice_licence", fileUrl: licenceDoc.url } },
          }),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw ApiError.conflict("An account with this email or phone already exists");
      }
      throw err;
    }

    await writeAuditLog(actorId, "admin_create_provider", "user", user.id, { role });
    await issuePasswordInvite(user);
    return toPublicUser(user);
  },

  // ── Launch reset (one-time: clear seed/demo data before real signups) ──────

  /** Counts of everything `performLaunchReset` would delete — call before showing the confirm step. */
  async previewLaunchReset() {
    const [nonAdminUsers, organizations, appointments, orders, payments, homeVisits, labOrders, ambulanceRequests, reviews] =
      await Promise.all([
        db.user.count({ where: { role: { not: "admin" } } }),
        db.organization.count(),
        db.appointment.count(),
        db.order.count(),
        db.payment.count(),
        db.homeVisit.count(),
        db.labOrder.count(),
        db.ambulanceRequest.count(),
        db.review.count(),
      ]);
    return { nonAdminUsers, organizations, appointments, orders, payments, homeVisits, labOrders, ambulanceRequests, reviews };
  },

  /**
   * Deletes every non-admin user and organization, and everything that hangs
   * off them (appointments, consultations, payments, orders, lab/ambulance
   * requests, reviews, audit history, ...) — a one-time reset so real
   * signups start from zero instead of alongside seeded demo data. Admin
   * accounts, and the shared drug catalogue, are left untouched.
   *
   * Deletion order follows the live FK graph: tables with a RESTRICT
   * constraint back to users/organizations have to go before their parent,
   * everything else (ledger entries, order items, messages, prescriptions, …)
   * cascades automatically.
   */
  async performLaunchReset(actorId: string) {
    await db.review.deleteMany({});
    await db.consultation.deleteMany({});
    await db.appointment.deleteMany({});
    await db.homeVisit.deleteMany({});
    await db.payment.deleteMany({});
    await db.order.deleteMany({});
    await db.recordAccessLog.deleteMany({});
    await db.medicalDocument.deleteMany({});
    await db.labOrder.deleteMany({});
    await db.ambulanceRequest.deleteMany({});
    await db.auditLog.deleteMany({});
    await db.organization.deleteMany({});
    const deletedUsers = await db.user.deleteMany({ where: { role: { not: "admin" } } });

    await writeAuditLog(actorId, "admin_launch_reset", "platform", "all", { deletedUsers: deletedUsers.count });
    return { deletedUsers: deletedUsers.count };
  },

  // ── Provider verification ─────────────────────────────────────────────────

  async listVerifications(query: VerificationsQuery) {
    const where: Record<string, unknown> = { user: { deletedAt: null } };
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

    // Approving a provider who already has a fee makes them bookable: open their calendar.
    if (input.status === "verified") await availabilityService.ensureSchedule(providerId);

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
    // "Today" and "last 30 days" in Nairobi time (UTC+3, no DST) — an admin
    // looking at "today" at 1am Nairobi shouldn't be shown yesterday's UTC day.
    const EAT_OFFSET_MS = 3 * 3_600_000;
    const nowMs = Date.now();
    const startOfToday = new Date(Math.floor((nowMs + EAT_OFFSET_MS) / 86_400_000) * 86_400_000 - EAT_OFFSET_MS);
    const thirtyDaysAgo = new Date(nowMs - 30 * 86_400_000);

    const sumCollected = (since?: Date) =>
      db.payment.aggregate({
        where: { status: "completed", ...(since ? { paidAt: { gte: since } } : {}) },
        _count: { _all: true },
        _sum: { amountKes: true },
      });
    const sumLedger = (types: ("platform_fee" | "vendor_payout" | "provider_payout" | "payout_settled")[], since?: Date) =>
      db.ledgerEntry.aggregate({
        where: { type: { in: types }, ...(since ? { createdAt: { gte: since } } : {}) },
        _sum: { amountKes: true },
      });

    const [
      userGroups,
      appointmentGroups,
      collectedAll,
      collectedToday,
      collected30,
      earningsAll,
      earningsToday,
      earnings30,
      payableAll,
      settledAll,
      refunded,
      orderCount,
      vendorOrderGroups,
      homeVisitGroups,
      revenueBySubject,
    ] = await Promise.all([
      db.user.groupBy({ by: ["role"], where: { deletedAt: null }, _count: { _all: true } }),
      db.appointment.groupBy({ by: ["status"], _count: { _all: true } }),
      sumCollected(),
      sumCollected(startOfToday),
      sumCollected(thirtyDaysAgo),
      sumLedger(["platform_fee"]),
      sumLedger(["platform_fee"], startOfToday),
      sumLedger(["platform_fee"], thirtyDaysAgo),
      sumLedger(["vendor_payout", "provider_payout"]),
      sumLedger(["payout_settled"]),
      db.payment.aggregate({ where: { status: "refunded" }, _sum: { refundedKes: true } }),
      db.order.count(),
      // Fulfilment status lives per vendor slice of a checkout now (a cart can span orgs).
      db.vendorOrder.groupBy({ by: ["status"], _count: { _all: true } }),
      db.homeVisit.groupBy({ by: ["status"], _count: { _all: true } }),
      // Collected, by what was bought — straight off the single polymorphic
      // Payment table, so every subject is counted the same way.
      db.payment.groupBy({ by: ["subjectType"], where: { status: "completed" }, _sum: { amountKes: true } }),
    ]);

    const bySubject = Object.fromEntries(revenueBySubject.map((r) => [r.subjectType, r._sum.amountKes ?? 0]));

    // Three different numbers that used to be reported as one "revenue":
    //
    //   collected — every shilling paid in (net of refunds, which leave
    //               "completed"). Most of it is not Care Bora's.
    //   earnings  — what Care Bora keeps: platform commission, plus the whole
    //               of any sale it makes itself. This is revenue.
    //   owed      — the share belonging to providers and vendors, not yet paid
    //               out. A liability, not income.
    //
    // collected = earnings + owed + already paid out, which is also the check
    // that these figures agree with each other.
    const earningsKes = earningsAll._sum.amountKes ?? 0;
    const owedKes = (payableAll._sum.amountKes ?? 0) - Math.abs(settledAll._sum.amountKes ?? 0);

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
        completedCount: collectedAll._count._all,
        collectedKes: collectedAll._sum.amountKes ?? 0,
        earningsKes,
        owedKes,
        refundedKes: refunded._sum.refundedKes ?? 0,
        bySubject: {
          appointment: bySubject.appointment ?? 0,
          home_visit: bySubject.home_visit ?? 0,
          order: bySubject.order ?? 0,
          lab_order: bySubject.lab_order ?? 0,
          ambulance: bySubject.ambulance ?? 0,
        },
        periods: {
          today: { collectedKes: collectedToday._sum.amountKes ?? 0, earningsKes: earningsToday._sum.amountKes ?? 0 },
          last30Days: { collectedKes: collected30._sum.amountKes ?? 0, earningsKes: earnings30._sum.amountKes ?? 0 },
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
