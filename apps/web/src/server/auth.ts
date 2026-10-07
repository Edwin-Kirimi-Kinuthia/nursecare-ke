import { NextResponse } from "next/server";
import { verifyAccessToken, resolveMembership, profileService, type AccessClaims } from "@carebora/core";
import { ApiError, type UserRole } from "@carebora/shared";
import type { RequestMeta } from "@carebora/core";

export const ACCESS_COOKIE = "cb_access";
export const REFRESH_COOKIE = "cb_refresh";

const IS_PROD = process.env.NODE_ENV === "production";
const ACCESS_TTL = Number(process.env.JWT_ACCESS_TTL ?? "900");
const REFRESH_TTL = Number(process.env.JWT_REFRESH_TTL ?? "2592000");

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

/** Pull the access token from the Authorization header (mobile) or cookie (web). */
function extractToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return readCookie(req, ACCESS_COOKIE);
}

/** Read the refresh token from the httpOnly cookie (web path). */
export function readRefreshCookie(req: Request): string | null {
  return readCookie(req, REFRESH_COOKIE);
}

/** Stamp auth cookies onto a NextResponse (mutates and returns it). */
export function setAuthCookies(
  res: NextResponse,
  tokens: { accessToken: string; refreshToken: string },
): NextResponse {
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TTL,
  });
  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: REFRESH_TTL,
  });
  return res;
}

/** Clear auth cookies on a response (for logout). */
export function clearAuthCookies(res: NextResponse): NextResponse {
  res.cookies.set(ACCESS_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, path: "/api/v1/auth", maxAge: 0 });
  return res;
}

/** Returns the auth claims if a valid token is present, else null. */
export async function getAuth(req: Request): Promise<AccessClaims | null> {
  const token = extractToken(req);
  if (!token) return null;
  try {
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}

/** Require a valid session; optionally restrict to specific roles. Throws otherwise. */
export async function requireAuth(
  req: Request,
  roles?: UserRole[],
): Promise<AccessClaims> {
  const auth = await getAuth(req);
  if (!auth) throw ApiError.unauthorized();
  if (roles && !roles.includes(auth.role)) throw ApiError.forbidden();
  return auth;
}

/**
 * Require a session that may act as a patient — which is any signed-in account.
 *
 * Replaces `requireAuth(req, ["patient"])` on the care-consuming routes.
 * Restricting those to role === "patient" meant a doctor or an admin couldn't
 * book a consultation, request a home visit or order medication for
 * themselves, which is a normal thing to want and nothing to do with the
 * powers their role carries.
 *
 * The patient profile is created on first use, since only accounts that
 * registered as patients were given one.
 */
export async function requirePatient(req: Request): Promise<AccessClaims> {
  const auth = await requireAuth(req);
  await profileService.ensurePatientProfile(auth.sub);
  return auth;
}

type OrgType = "pharmacy" | "ambulance" | "lab" | "clinic";

/**
 * Require the caller to be an active member of an Organization. Resolves the org
 * from `opts.orgId` when given, else the caller's first active membership (the
 * common case for single-org vendor users). Every `/api/v1/vendor/*` route starts
 * with this, matching the `requireAuth(req, roles?)` convention used elsewhere.
 *
 * Pass `orgType` on every route that only makes sense for one kind of business
 * (ambulance dispatch, lab orders, pharmacy listings) — membership alone does
 * NOT imply the org does that kind of business. Without this, e.g. a pharmacy
 * vendor could accept and dispatch ambulance requests meant for ambulance
 * operators, since org membership and role are otherwise identical in shape
 * across every org type.
 *
 * Also blocks every route once the org is `suspended` or `rejected` — an
 * admin suspension must actually freeze the vendor's ability to operate, not
 * just hide them from the storefront. `pending` and `in_review` stay allowed
 * (an unapproved applicant still manages its own draft catalogue/branches).
 */
export async function requireOrgMember(
  req: Request,
  opts?: { orgId?: string; roles?: Array<"owner" | "manager" | "staff">; orgType?: OrgType | OrgType[] },
): Promise<AccessClaims & { orgId: string; orgRole: "owner" | "manager" | "staff"; orgType: OrgType }> {
  const auth = await requireAuth(req);
  const { orgId, role, orgType, orgStatus } = await resolveMembership(auth.sub, opts?.orgId);
  if (orgStatus === "suspended" || orgStatus === "rejected") {
    throw ApiError.forbidden("Your organization's access has been suspended. Contact support.");
  }
  if (opts?.roles && !opts.roles.includes(role)) {
    throw ApiError.forbidden("Your role in this organization does not permit this action");
  }
  if (opts?.orgType) {
    const allowed = Array.isArray(opts.orgType) ? opts.orgType : [opts.orgType];
    if (!allowed.includes(orgType)) {
      throw ApiError.forbidden("This action is not available for your business type");
    }
  }
  return { ...auth, orgId, orgRole: role, orgType };
}

/** Best-effort request metadata for audit/session records. */
export function requestMeta(req: Request): RequestMeta {
  return {
    userAgent: req.headers.get("user-agent"),
    ip:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip"),
  };
}
