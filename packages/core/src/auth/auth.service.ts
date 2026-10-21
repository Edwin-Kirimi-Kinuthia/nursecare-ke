import { db, Prisma, type User } from "@carebora/db";
import { randomInt, randomBytes, createHash } from "node:crypto";
import {
  type PatchMeInput,
  ApiError,
  PROVIDER_ROLES,
  type LoginInput,
  type LoginChallengeResult,
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
import { notificationService } from "../notifications/notification.service";
import { putFile } from "../storage/storage";
import { deleteAccount } from "./account-deletion";

const REFRESH_TTL_SECONDS = Number(process.env.JWT_REFRESH_TTL ?? "2592000");
const EMAIL_VERIFICATION_TTL_MINUTES = 15;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LOGIN_OTP_TTL_MINUTES = 10;
const CHANGE_PASSWORD_OTP_TTL_MINUTES = 10;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * A 6-digit code has a million possible values and lives for ten minutes, so
 * without a limit it can simply be guessed — the check used to answer "wrong"
 * indefinitely, and the right code still worked after any number of misses.
 * Each code now accepts a few guesses and then locks.
 */
const MAX_CODE_ATTEMPTS = 5;

/** How many fresh codes one account may be sent per window — otherwise requesting
 *  a new code (which resets the guess count) is just a slower way to brute-force,
 *  and a free way to flood someone's inbox. */
const MAX_CODES_PER_WINDOW = 5;
const CODE_WINDOW_MS = 15 * 60 * 1000;

async function assertCanIssueCode(userId: string, channel: string) {
  const recent = await db.verificationCode.count({
    where: { userId, channel, createdAt: { gte: new Date(Date.now() - CODE_WINDOW_MS) } },
  });
  if (recent >= MAX_CODES_PER_WINDOW) {
    throw ApiError.tooManyRequests("Too many codes requested. Please wait a few minutes before trying again.");
  }
}

/**
 * Check a submitted code against the newest live one for this user and channel.
 *
 * The attempt is spent *before* the comparison, atomically, and only while
 * attempts remain. Comparing first and counting after would let a burst of
 * parallel requests each pass the "attempts left?" check before any of them
 * recorded a miss, which is the one way to get past a counter.
 *
 * Returns the record on a match; throws `invalid` (the caller's own error, so
 * each endpoint keeps its existing status) or a 429 once the code is locked.
 */
async function spendCodeAttempt(
  userId: string,
  channel: string,
  code: string,
  invalid: () => ApiError,
) {
  const record = await db.verificationCode.findFirst({
    where: { userId, channel, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!record || record.expiresAt < new Date()) throw invalid();

  const spent = await db.verificationCode.updateMany({
    where: { id: record.id, consumedAt: null, attempts: { lt: MAX_CODE_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
  if (spent.count === 0) {
    throw ApiError.tooManyRequests("Too many incorrect attempts. Please request a new code.");
  }
  if (record.codeHash !== hashCode(code)) throw invalid();
  return record;
}

/** Generate a 6-digit email verification code, store its hash, and email it. */
async function issueEmailVerification(user: Pick<User, "id" | "email" | "fullName">) {
  await assertCanIssueCode(user.id, "email");
  const code = generateOtp();
  await db.verificationCode.create({
    data: {
      userId: user.id,
      channel: "email",
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000),
    },
  });
  await notificationService.emailVerificationCode({
    email: user.email,
    fullName: user.fullName,
    code,
  });
}

/** Second factor on every password login: a 6-digit code emailed after the password checks out. */
async function issueLoginOtp(user: Pick<User, "id" | "email" | "fullName">) {
  await assertCanIssueCode(user.id, "login_otp");
  const code = generateOtp();
  await db.verificationCode.create({
    data: {
      userId: user.id,
      channel: "login_otp",
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + LOGIN_OTP_TTL_MINUTES * 60 * 1000),
    },
  });
  await notificationService.loginOtpCode({ email: user.email, fullName: user.fullName, code });
}

/** Second factor on changing your own password while logged in: a 6-digit code emailed after the current password checks out. */
async function issueChangePasswordOtp(user: Pick<User, "id" | "email" | "fullName">) {
  await assertCanIssueCode(user.id, "change_password_otp");
  const code = generateOtp();
  await db.verificationCode.create({
    data: {
      userId: user.id,
      channel: "change_password_otp",
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + CHANGE_PASSWORD_OTP_TTL_MINUTES * 60 * 1000),
    },
  });
  await notificationService.changePasswordOtp({ email: user.email, fullName: user.fullName, code });
}

/** Generate an invite/reset token and store its hash. Shared by admin invites and self-service password resets. */
async function createInviteToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db.verificationCode.create({
    data: {
      userId,
      channel: "invite",
      codeHash: hashCode(token),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });
  return token;
}

/** Admin-recruited account: email a set-password link. */
export async function issuePasswordInvite(user: Pick<User, "id" | "email" | "fullName">) {
  const token = await createInviteToken(user.id);
  await notificationService.accountInvite({ email: user.email, fullName: user.fullName, token });
}

/** Self-service "forgot password": email a reset link. */
async function issuePasswordReset(user: Pick<User, "id" | "email" | "fullName">) {
  const token = await createInviteToken(user.id);
  await notificationService.passwordResetRequested({ email: user.email, fullName: user.fullName, token });
}

export interface RequestMeta {
  userAgent?: string | null;
  ip?: string | null;
}

export function toPublicUser(u: User): PublicUser {
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
export async function issueSession(userId: string, role: UserRole, meta?: RequestMeta) {
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
    // Awaited deliberately: on Vercel's serverless runtime, a fire-and-forget
    // promise isn't guaranteed to run to completion after the response is
    // sent, which was silently dropping this send entirely. A genuine failure
    // here still shouldn't fail registration — the user can request a resend.
    try {
      await issueEmailVerification(user);
    } catch {
      /* best-effort — user can request a resend */
    }
    return { user: toPublicUser(user), ...tokens };
  },

  /** (Re)send a 6-digit email verification code to the signed-in user. */
  async requestEmailVerification(userId: string) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound("Account not found");
    if (user.emailVerifiedAt) return { sent: false };
    await issueEmailVerification(user);
    return { sent: true };
  },

  /** Confirm a code emailed by `requestEmailVerification` and mark the email verified. */
  async verifyEmail(userId: string, code: string): Promise<PublicUser> {
    const record = await spendCodeAttempt(userId, "email", code, () => ApiError.badRequest("Invalid or expired code"));
    const [, user] = await db.$transaction([
      db.verificationCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
      db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } }),
    ]);
    return toPublicUser(user);
  },

  /**
   * Consume an invite link (sent by `issuePasswordInvite`, e.g. after an
   * admin-created provider account): set the password, mark the email
   * verified (the admin/invite already vouches for it), and sign the user in.
   */
  async setPassword(token: string, password: string) {
    const record = await db.verificationCode.findFirst({
      where: { channel: "invite", codeHash: hashCode(token), consumedAt: null },
    });
    if (!record || record.expiresAt < new Date()) {
      throw ApiError.badRequest("This invite link is invalid or has expired");
    }
    const [, , user] = await db.$transaction([
      db.verificationCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
      db.credentials.upsert({
        where: { userId: record.userId },
        update: { passwordHash: hashPassword(password) },
        create: { userId: record.userId, passwordHash: hashPassword(password) },
      }),
      db.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    ]);
    const tokens = await issueSession(user.id, user.role as UserRole, undefined);
    return { user: toPublicUser(user), ...tokens };
  },

  /**
   * Step 1 of rotating your own password: prove you know the current one,
   * then email a 6-digit code — a second factor on top of an already
   * authenticated action, since a leaked/compromised password is often
   * exactly the scenario this gets used in.
   */
  async requestChangePasswordOtp(userId: string, currentPassword: string) {
    const user = await db.user.findUnique({ where: { id: userId }, include: { credentials: true } });
    if (!user || !user.credentials || !verifyPassword(currentPassword, user.credentials.passwordHash)) {
      throw ApiError.unauthorized("Current password is incorrect");
    }
    await issueChangePasswordOtp(user);
    return { sent: true };
  },

  /** Step 2: confirm the emailed code and set the new password. */
  async confirmChangePassword(userId: string, code: string, newPassword: string) {
    const record = await spendCodeAttempt(userId, "change_password_otp", code, () => ApiError.badRequest("Invalid or expired code"));
    await db.$transaction([
      db.verificationCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
      db.credentials.update({ where: { userId }, data: { passwordHash: hashPassword(newPassword) } }),
    ]);
    return { changed: true };
  },

  /**
   * Request a password-reset email. Always reports success regardless of
   * whether the address is registered — telling the caller either way would
   * let anyone enumerate which emails have a CareBora account.
   */
  async forgotPassword(email: string) {
    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      await issuePasswordReset(user);
    }
    return { sent: true };
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

    const avatar = await putFile("avatar", input.avatarUrl);
    const licenceDoc = await putFile("verification_document", input.licenceDocumentUrl);

    let user: User;
    try {
      user = await db.user.create({
        data: {
          email: input.email,
          fullName: input.fullName,
          phone: input.phone ?? null,
          role,
          avatarUrl: avatar.url,
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
          verificationDocuments: {
            create: { type: "practice_licence", fileUrl: licenceDoc.url },
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

  /**
   * Step 1 of login: verify credentials, then email a 6-digit code instead of
   * signing in directly — every password login gets this second factor.
   */
  async login(input: LoginInput): Promise<LoginChallengeResult> {
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

    await issueLoginOtp(user);
    return { requiresOtp: true, email: user.email };
  },

  /** Step 2 of login: confirm the emailed code and start the session. */
  async verifyLoginOtp(email: string, code: string, meta?: RequestMeta) {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) throw ApiError.unauthorized("Invalid or expired code");

    const record = await spendCodeAttempt(user.id, "login_otp", code, () => ApiError.unauthorized("Invalid or expired code"));
    await db.verificationCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });

    const tokens = await issueSession(user.id, user.role as UserRole, meta);
    return { user: toPublicUser(user), ...tokens };
  },

  /** Resend the login code — only while a login attempt (a correct password) is actually in progress. */
  async resendLoginOtp(email: string) {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) return { sent: false };

    const pending = await db.verificationCode.findFirst({
      where: { userId: user.id, channel: "login_otp", consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!pending) return { sent: false };

    await issueLoginOtp(user);
    return { sent: true };
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

  /**
   * Update the account's own fields — display name, phone, profile photo.
   *
   * Available to every role: a provider changing the photo clients see on
   * their public profile and a patient correcting a typo in their phone number
   * are the same operation on the same columns.
   */
  async patchMe(userId: string, input: PatchMeInput) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound("User not found");

    // Every upload goes through putFile, which owns the size limit and is the
    // seam a move to blob storage would change. A plain http(s) URL (or null to
    // clear) passes straight through.
    let avatarUrl = input.avatarUrl;
    if (typeof avatarUrl === "string" && avatarUrl.startsWith("data:")) {
      avatarUrl = (await putFile("avatar", avatarUrl)).url;
    }

    try {
      await db.user.update({
        where: { id: userId },
        data: {
          ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
          // An empty string means "remove it", which is distinct from the
          // field being absent and left alone.
          ...(input.phone !== undefined ? { phone: input.phone === "" ? null : input.phone } : {}),
          ...(input.avatarUrl !== undefined ? { avatarUrl } : {}),
          // A changed number is unverified again until it's confirmed.
          ...(input.phone !== undefined && input.phone !== user.phone ? { phoneVerifiedAt: null } : {}),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw ApiError.conflict("That phone number is already on another account");
      }
      throw err;
    }
    return this.getProfile(userId);
  },

  /** Delete the signed-in user's account (anonymise in place). See account-deletion.ts. */
  deleteAccount,

  /** Rotate a refresh token: revoke the old session and mint a new one. */
  /**
   * `maxIdleSeconds` (web): every refresh issues a fresh session row, so a
   * session's age is the time since the person was last active enough to need a
   * new access token. Beyond the limit the session has been idle too long and
   * they must sign in again. Left unset for mobile, which keeps its long-lived session.
   */
  async refresh(rawToken: string | null, meta?: RequestMeta, opts?: { maxIdleSeconds?: number }) {
    if (!rawToken) throw ApiError.unauthorized("Refresh token required");
    const hash = hashRefreshToken(rawToken);
    const session = await db.session.findFirst({
      where: { refreshTokenHash: hash },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw ApiError.unauthorized("Session expired or invalid");
    }
    if (opts?.maxIdleSeconds && Date.now() - session.createdAt.getTime() > opts.maxIdleSeconds * 1000) {
      await db.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      throw ApiError.unauthorized("You were signed out after a period of inactivity");
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
