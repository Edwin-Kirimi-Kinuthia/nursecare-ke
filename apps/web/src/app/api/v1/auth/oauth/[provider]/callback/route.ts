import { NextResponse } from "next/server";
import { oauthService } from "@carebora/core";
import { OAUTH_PROVIDERS, type OAuthProvider } from "@carebora/shared";
import { setAuthCookies, requestMeta, readCookie } from "@/server/auth";
import { OAUTH_STATE_COOKIE } from "../start/route";

function appUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
}

function fail(req: Request, message: string) {
  const url = new URL("/login", appUrl(req));
  url.searchParams.set("oauthError", message);
  return NextResponse.redirect(url);
}

/** GET /api/v1/auth/oauth/:provider/callback — Google and Facebook land here. */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!OAUTH_PROVIDERS.includes(provider as OAuthProvider)) return fail(req, "unsupported_provider");

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = readCookie(req, OAUTH_STATE_COOKIE);
  if (!code || !state || !expectedState || state !== expectedState) {
    return fail(req, "invalid_state");
  }

  let result;
  try {
    result = await oauthService.handleCallback(provider as OAuthProvider, code, requestMeta(req));
  } catch (err) {
    return fail(req, err instanceof Error ? err.message : "sign_in_failed");
  }

  const dest = new URL("/providers", appUrl(req));
  const res = NextResponse.redirect(dest);
  res.cookies.set(OAUTH_STATE_COOKIE, "", { httpOnly: true, path: "/api/v1/auth/oauth", maxAge: 0 });
  return setAuthCookies(res, result);
}
