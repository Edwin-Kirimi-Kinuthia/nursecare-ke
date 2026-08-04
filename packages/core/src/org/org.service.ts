import { db, Prisma } from "@carebora/db";
import {
  ApiError,
  type CreateBranchInput,
  type PatchBranchInput,
  type PatchOrgInput,
  type InviteMemberInput,
  type OrgsQuery,
  type ReviewOrgInput,
  type NearbyQuery,
} from "@carebora/shared";

async function writeAuditLog(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
) {
  await db.auditLog.create({
    data: { actorId, action, entityType, entityId, metadata: (metadata as Prisma.InputJsonValue) ?? Prisma.DbNull },
  });
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Generates a unique org slug, appending a short suffix on collision. */
export async function generateUniqueOrgSlug(name: string): Promise<string> {
  const base = slugify(name) || "org";
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const existing = await db.organization.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  throw ApiError.conflict("Could not generate a unique business slug — try a different name");
}

const ORG_INCLUDE = {
  branches: { orderBy: { createdAt: "asc" as const } },
  members: {
    where: { isActive: true },
    include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
  },
};

async function assertMember(orgId: string, userId: string, roles?: Array<"owner" | "manager" | "staff">) {
  const member = await db.orgMember.findFirst({ where: { orgId, userId, isActive: true } });
  if (!member) throw ApiError.forbidden("You are not a member of this organization");
  if (roles && !roles.includes(member.role)) {
    throw ApiError.forbidden("Your role does not permit this action");
  }
  return member;
}

/**
 * Resolves which org an authenticated user is acting for. If `orgId` is given,
 * validates membership in exactly that org; otherwise falls back to the user's
 * first active membership (the common case: most vendor users belong to one org).
 * Always returns the org's `type` too — callers that are type-specific (e.g. the
 * ambulance dispatch queue) must check it themselves; nothing here assumes a
 * membership implies the org does the kind of business the route expects.
 * Used by the web layer's `requireOrgMember` guard.
 */
export async function resolveMembership(userId: string, orgId?: string) {
  if (orgId) {
    const member = await assertMember(orgId, userId);
    const org = await db.organization.findUniqueOrThrow({ where: { id: orgId }, select: { type: true, status: true } });
    return { orgId, role: member.role, orgType: org.type, orgStatus: org.status };
  }
  const member = await db.orgMember.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
    include: { organization: { select: { type: true, status: true } } },
  });
  if (!member) throw ApiError.forbidden("You do not belong to any organization");
  return { orgId: member.orgId, role: member.role, orgType: member.organization.type, orgStatus: member.organization.status };
}

export const orgService = {
  /** Orgs the given user actively belongs to (a vendor dashboard's org switcher). */
  async listForUser(userId: string) {
    const memberships = await db.orgMember.findMany({
      where: { userId, isActive: true },
      include: { organization: { include: ORG_INCLUDE } },
      orderBy: { createdAt: "asc" },
    });
    return memberships.map((m) => ({ role: m.role, organization: m.organization }));
  },

  async getById(orgId: string, userId: string) {
    await assertMember(orgId, userId);
    const org = await db.organization.findUnique({ where: { id: orgId }, include: ORG_INCLUDE });
    if (!org) throw ApiError.notFound("Organization not found");
    return org;
  },

  async patch(orgId: string, userId: string, input: PatchOrgInput) {
    await assertMember(orgId, userId, ["owner", "manager"]);
    return db.organization.update({ where: { id: orgId }, data: input, include: ORG_INCLUDE });
  },

  async listMembers(orgId: string, userId: string) {
    await assertMember(orgId, userId);
    return db.orgMember.findMany({
      where: { orgId },
      include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true, isActive: true } } },
      orderBy: { createdAt: "asc" },
    });
  },

  /** Adds an existing registered user to the org. They must already have an account. */
  async inviteMember(orgId: string, actorUserId: string, input: InviteMemberInput) {
    await assertMember(orgId, actorUserId, ["owner", "manager"]);
    const target = await db.user.findUnique({ where: { email: input.email } });
    if (!target) {
      throw ApiError.notFound("No CareBora account with that email yet — ask them to register first");
    }
    const existing = await db.orgMember.findUnique({ where: { orgId_userId: { orgId, userId: target.id } } });
    if (existing) {
      return db.orgMember.update({
        where: { id: existing.id },
        data: { isActive: true, role: input.role },
        include: { user: { select: { id: true, fullName: true, email: true } } },
      });
    }
    return db.orgMember.create({
      data: { orgId, userId: target.id, role: input.role },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
  },

  async removeMember(orgId: string, actorUserId: string, memberId: string) {
    await assertMember(orgId, actorUserId, ["owner", "manager"]);
    const member = await db.orgMember.findFirst({ where: { id: memberId, orgId } });
    if (!member) throw ApiError.notFound("Member not found");
    if (member.role === "owner") throw ApiError.badRequest("Cannot remove the owner");
    return db.orgMember.update({ where: { id: memberId }, data: { isActive: false } });
  },

  async listBranches(orgId: string, userId: string) {
    await assertMember(orgId, userId);
    return db.orgBranch.findMany({ where: { orgId }, orderBy: { createdAt: "asc" } });
  },

  async createBranch(orgId: string, userId: string, input: CreateBranchInput) {
    await assertMember(orgId, userId, ["owner", "manager"]);
    return db.orgBranch.create({ data: { orgId, ...input } });
  },

  async patchBranch(orgId: string, userId: string, branchId: string, input: PatchBranchInput) {
    await assertMember(orgId, userId, ["owner", "manager"]);
    const branch = await db.orgBranch.findFirst({ where: { id: branchId, orgId } });
    if (!branch) throw ApiError.notFound("Branch not found");
    return db.orgBranch.update({ where: { id: branchId }, data: input });
  },

  // ── Admin ────────────────────────────────────────────────────────────────

  async adminList(query: OrgsQuery) {
    const where: Record<string, unknown> = {};
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { licenceNumber: { contains: query.search, mode: "insensitive" } },
      ];
    }
    const [organizations, total] = await Promise.all([
      db.organization.findMany({
        where,
        include: { branches: true, members: { where: { role: "owner" }, include: { user: { select: { fullName: true, email: true } } } } },
        orderBy: { createdAt: "desc" },
        skip: query.offset,
        take: query.limit,
      }),
      db.organization.count({ where }),
    ]);
    return { organizations, total };
  },

  async adminReview(orgId: string, adminId: string, input: ReviewOrgInput) {
    const org = await db.organization.findUnique({ where: { id: orgId } });
    if (!org) throw ApiError.notFound("Organization not found");
    const updated = await db.organization.update({
      where: { id: orgId },
      data: {
        status: input.status,
        reviewedById: adminId,
        reviewedAt: new Date(),
        reviewNotes: input.notes ?? null,
        ...(input.commissionPercent !== undefined ? { commissionPercent: input.commissionPercent } : {}),
      },
    });
    await writeAuditLog(adminId, `org_${input.status}`, "Organization", orgId, { notes: input.notes });
    return updated;
  },

  /**
   * Ranks approved+active orgs of a given type by distance from (lat, lng) using
   * PostGIS `ST_Distance` over the geography column that org_branches.geog stays
   * in sync with via a DB trigger. Falls back to county-equality ranking (no
   * distance) when the caller has no coordinates.
   */
  async findNearby(query: NearbyQuery) {
    if (query.lat !== undefined && query.lng !== undefined) {
      return db.$queryRaw<
        Array<{
          orgId: string; orgName: string; branchId: string; branchName: string;
          county: string; town: string | null; distanceKm: number;
          deliveryFeeKes: number; deliveryRadiusKm: number;
        }>
      >`
        SELECT
          o.id AS "orgId", o.name AS "orgName",
          b.id AS "branchId", b.name AS "branchName",
          b.county, b.town,
          round((ST_Distance(b.geog, ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography) / 1000)::numeric, 2)::float AS "distanceKm",
          b.delivery_fee_kes AS "deliveryFeeKes",
          b.delivery_radius_km AS "deliveryRadiusKm"
        FROM org_branches b
        JOIN organizations o ON o.id = b.org_id
        WHERE o.type = ${query.type}::"OrgType"
          AND o.status = 'approved'
          AND b.is_active = true
          AND ST_DWithin(b.geog, ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography, b.delivery_radius_km * 1000)
        ORDER BY "distanceKm" ASC
        LIMIT ${query.limit}
      `;
    }

    const where: Record<string, unknown> = { type: query.type, status: "approved" };
    if (query.county) where.branches = { some: { county: query.county, isActive: true } };
    const orgs = await db.organization.findMany({
      where,
      include: { branches: { where: query.county ? { county: query.county, isActive: true } : { isActive: true }, take: 1 } },
      orderBy: [{ ratingAvg: "desc" }, { createdAt: "asc" }],
      take: query.limit,
    });
    return orgs
      .filter((o) => o.branches.length > 0)
      .map((o) => {
        const b = o.branches[0]!;
        return {
          orgId: o.id, orgName: o.name, branchId: b.id, branchName: b.name,
          county: b.county, town: b.town, distanceKm: null as number | null,
          deliveryFeeKes: b.deliveryFeeKes, deliveryRadiusKm: b.deliveryRadiusKm,
        };
      });
  },
};
