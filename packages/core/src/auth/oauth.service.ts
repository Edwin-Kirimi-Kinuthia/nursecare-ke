import { db } from "@carebora/db";
import { randomBytes } from "node:crypto";
import { ApiError, type OAuthProvider, type UserRole } from "@carebora/shared";
import { issueSession, toPublicUser, type RequestMeta } from "./auth.service";

/** Minimal identity we need out of any provider, however it gets there. */
interface OAuthProfile {
  providerAccountId: string;
  email: string | null;
  fullName: string;
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function callbackUrl(provider: OAuthProvider): string {
  return `${appUrl()}/api/v1/auth/oauth/${provider}/callback`;
}

/** Random CSRF token for the authorize/callback round trip. */
export function generateOAuthState(): string {
  return randomBytes(16).toString("hex");
}

/** Where to send the browser to start each provider's consent screen. */
export function getAuthorizeUrl(provider: OAuthProvider, state: string): string {
  const redirectUri = callbackUrl(provider);
  switch (provider) {
    case "google": {
      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
        prompt: "select_account",
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }
    case "facebook": {
      const params = new URLSearchParams({
        client_id: process.env.FACEBOOK_CLIENT_ID ?? "",
        redirect_uri: redirectUri,
        state,
        scope: "email,public_profile",
      });
      return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
    }
  }
}

async function fetchGoogleProfile(code: string): Promise<OAuthProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: callbackUrl("google"),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw ApiError.serviceUnavailable("Google sign-in failed — could not exchange code");
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) throw ApiError.serviceUnavailable("Google sign-in failed — could not read profile");
  const info = (await infoRes.json()) as { sub: string; email?: string; name?: string };
  return { providerAccountId: info.sub, email: info.email ?? null, fullName: info.name ?? info.email ?? "Google User" };
}

async function fetchFacebookProfile(code: string): Promise<OAuthProfile> {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_CLIENT_ID ?? "",
    client_secret: process.env.FACEBOOK_CLIENT_SECRET ?? "",
    redirect_uri: callbackUrl("facebook"),
    code,
  });
  const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params}`);
  if (!tokenRes.ok) throw ApiError.serviceUnavailable("Facebook sign-in failed — could not exchange code");
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const infoRes = await fetch(
    `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${encodeURIComponent(access_token)}`,
  );
  if (!infoRes.ok) throw ApiError.serviceUnavailable("Facebook sign-in failed — could not read profile");
  const info = (await infoRes.json()) as { id: string; email?: string; name?: string };
  return { providerAccountId: info.id, email: info.email ?? null, fullName: info.name ?? "Facebook User" };
}

/** Exchange an authorization code for the caller's identity at the given provider. */
async function fetchProfile(provider: OAuthProvider, code: string): Promise<OAuthProfile> {
  switch (provider) {
    case "google":
      return fetchGoogleProfile(code);
    case "facebook":
      return fetchFacebookProfile(code);
  }
}

export const oauthService = {
  /**
   * Handle the provider callback: find the linked account, or link/create a
   * patient account by email, then sign in exactly like email/password login.
   */
  async handleCallback(provider: OAuthProvider, code: string, meta?: RequestMeta) {
    const profile = await fetchProfile(provider, code);

    const existingLink = await db.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId: profile.providerAccountId } },
      include: { user: true },
    });
    if (existingLink) {
      const tokens = await issueSession(existingLink.user.id, existingLink.user.role as UserRole, meta);
      return { user: toPublicUser(existingLink.user), ...tokens };
    }

    if (!profile.email) {
      throw ApiError.badRequest(
        `Your ${provider} account didn't share an email address, so we can't use it to sign you up. Try email signup instead.`,
      );
    }

    let user = await db.user.findUnique({ where: { email: profile.email } });
    if (user) {
      await db.oAuthAccount.create({
        data: { userId: user.id, provider, providerAccountId: profile.providerAccountId, email: profile.email },
      });
    } else {
      user = await db.user.create({
        data: {
          email: profile.email,
          fullName: profile.fullName,
          role: "patient",
          emailVerifiedAt: new Date(), // the provider already verified it
          patientProfile: { create: {} },
          oauthAccounts: {
            create: { provider, providerAccountId: profile.providerAccountId, email: profile.email },
          },
        },
      });
    }

    const tokens = await issueSession(user.id, user.role as UserRole, meta);
    return { user: toPublicUser(user), ...tokens };
  },
};
