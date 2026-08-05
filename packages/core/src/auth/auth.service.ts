import { db, Prisma, type User } from "@carebora/db";
import {
  ApiError,
  PROVIDER_ROLES,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
  type ProviderApplicationInput,
  type VendorApplicationInput,
  type UserRole,
} from "@carebora/shared";
import { hashPassword, verifyPassword } from "./password";
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "./tokens";
import { generateUniqueOrgSlug } from "../org/org.service";

const REFRESH_TTL_SECONDS = Number(process.env.JWT_REFRESH_TTL ?? "2592000");

export interface RequestMeta {
  userAgent?: string | null;
  ip?: string | null;
}

function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    role: u.role as PublicUser["role"],
    avatarUrl: u.avatarUrl,
    emailVerified: u.emailVerifiedAt != null,
    phoneVerified: u.phoneVerifiedAt != null,
    createdAt: u.createdAt,
  };
}

/** Create a session row (hashed refresh token) and mint an access token. */
async function issueSession(userId: string, role: UserRole, meta?: RequestMeta) {
  const accessToken = await signAccessToken({ sub: userId, role });
  const refreshToken = generateRefreshToken();
  await db.session.create({
    data: {
      userId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      userAgent: meta?.userAgent ?? null,
      ipAddress: meta?.ip ?? null,
      expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
    },
  });
  return { accessToken, refreshToken };
}

export const authService = {
  /** Register a patient or provider, create their empty profile, and sign them in. */
  async register(input: RegisterInput, meta?: RequestMeta) {
    const role = input.role as UserRole;
    const isProvider = PROVIDER_ROLES.includes(role);

    let user: User;
    try {
      user = await db.user.create({
        data: {
          email: input.email,
          fullName: input.fullName,
          phone: input.phone ?? null,
          role,
          credentials: { create: { passwordHash: hashPassword(input.password) } },
          ...(isProvider
            ? { providerProfile: { create: {} } }
            : { patientProfile: { create: {} } }),
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw ApiError.conflict("An account with this email or phone already exists");
      }
      throw err;
    }

    const tokens = await issueSession(user.id, role, meta);
    return { user: toPublicUser(user), ...tokens };
  },

  /**
   * Apply as a healthcare provider — creates the account with a provider profile
   * in `pending` verification status so it lands in the admin review queue.
   */
  async applyAsProvider(input: ProviderApplicationInput, meta?: RequestMeta) {
    const role = input.role as UserRole;
    const qualifications = input.qualifications
      ? input.qualifications.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
      : [];

    let user: User;
    try {
      user = await db.user.create({
        data: {
          email: input.email,
          fullName: input.fullName,
          phone: input.phone ?? null,
          role,
          credentials: { create: { passwordHash: hashPassword(input.password) } },
          providerProfile: {
            create: {
              specialty: input.specialty,
              licenceNumber: input.licenceNumber,
              licenceBody: input.licenceBody ?? null,
              yearsExperience: input.yearsExperience ?? 0,
              qualifications,
              verificationStatus: "pending",
            },
          },
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw ApiError.conflict("An account with this email or phone already exists");
      }
      throw err;
    }

    const tokens = await issueSession(user.id, role, meta);
    return { user: toPublicUser(user), ...tokens };
  },

  /**
   * Apply as a marketplace vendor (pharmacy/ambulance/lab) — creates the account
   * with role `vendor` plus a `pending` Organization, an `owner` membership, and
   * the first branch, in one transaction. Lands in the admin org-review queue.
   */
  async applyAsVendor(input: VendorApplicationInput, meta?: RequestMeta) {
    const slug = await generateUniqueOrgSlug(input.orgName);

    let user: User;
    try {
      user = await db.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: input.email,
            fullName: input.fullName,
            phone: input.phone ?? null,
            role: "vendor",
            credentials: { create: { passwordHash: hashPassword(input.password) } },
          },
        });
        const org = await tx.organization.create({
          data: {
            type: input.orgType,
            name: input.orgName,
            slug,
            description: input.description ?? null,
            licenceNumber: input.licenceNumber,
            licenceBody: input.licenceBody ?? null,
            kraPin: input.kraPin ?? null,
            contactEmail: input.contactEmail ?? input.email,
            contactPhone: input.contactPhone ?? input.phone ?? null,
            status: "pending",
          },
        });
        await tx.orgMember.create({ data: { orgId: org.id, userId: created.id, role: "owner" } });
        await tx.orgBranch.create({ data: { orgId: org.id, ...input.branch } });
        return created;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw ApiError.conflict("An account with this email or phone already exists");
      }
      throw err;
    }

    const tokens = await issueSession(user.id, "vendor", meta);
    return { user: toPublicUser(user), ...tokens };
  },

  /** Verify credentials and start a new session. */
  async login(input: LoginInput, meta?: RequestMeta) {
    const user = await db.user.findUnique({
      where: { email: input.email },
      include: { credentials: true },
    });
    if (
      !user ||
      !user.credentials ||
      !verifyPassword(input.password, user.credentials.passwordHash)
    ) {
      throw ApiError.unauthorized("Invalid email or password");
    }
    if (!user.isActive) throw ApiError.forbidden("This account is disabled");

    const tokens = await issueSession(user.id, user.role as UserRole, meta);
    return { user: toPublicUser(user), ...tokens };
  },

  /** Fetch the authenticated user plus their role-specific profile. */
  async getProfile(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { patientProfile: true, providerProfile: true },
    });
    if (!user) throw ApiError.notFound("User not found");
    return {
      ...toPublicUser(user),
      patientProfile: user.patientProfile ?? undefined,
      providerProfile: user.providerProfile ?? undefined,
    };
  },

  /** Rotate a refresh token: revoke the old session and mint a new one. */
  async refresh(rawToken: string | null, meta?: RequestMeta) {
    if (!rawToken) throw ApiError.unauthorized("Refresh token required");
    const hash = hashRefreshToken(rawToken);
    const session = await db.session.findFirst({
      where: { refreshTokenHash: hash },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw ApiError.unauthorized("Session expired or invalid");
    }
    await db.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await issueSession(session.userId, session.user.role as UserRole, meta);
    return { user: toPublicUser(session.user), ...tokens };
  },

  /** Revoke a session (logout). Silently no-ops if the token is already gone. */
  async logout(rawToken: string | null) {
    if (!rawToken) return;
    const hash = hashRefreshToken(rawToken);
    await db.session.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
