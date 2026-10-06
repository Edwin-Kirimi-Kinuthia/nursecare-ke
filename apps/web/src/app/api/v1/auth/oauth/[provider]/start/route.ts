import { NextResponse } from "next/server";
import { getAuthorizeUrl, generateOAuthState } from "@carebora/core";
import { OAUTH_PROVIDERS, type OAuthProvider } from "@carebora/shared";

export const OAUTH_STATE_COOKIE = "cb_oauth_state";
const IS_PROD = process.env.NODE_ENV === "production";

/** GET /api/v1/auth/oauth/:provider/start — redirect to the provider's consent screen. */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!OAUTH_PROVIDERS.includes(provider as OAuthProvider)) {
    return NextResponse.redirect(new URL("/login?oauthError=unsupported_provider", req.url));
  }

  const state = generateOAuthState();
  const res = NextResponse.redirect(getAuthorizeUrl(provider as OAuthProvider, state));
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: IS_PROD,
    // "Lax" is sent on the top-level GET navigation both Google and Facebook
    // use for their callback, which is all this needs.
    sameSite: "lax",
    path: "/api/v1/auth/oauth",
    maxAge: 600,
  });
  return res;
}
