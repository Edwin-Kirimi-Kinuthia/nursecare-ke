/**
 * Canonical site origin, used for metadataBase, canonical URLs, the sitemap,
 * robots.txt and JSON-LD.
 *
 * Set NEXT_PUBLIC_APP_URL to the live domain in each environment — getting this
 * wrong points canonicals and the sitemap at the wrong host, which is one of the
 * few SEO mistakes that actively suppresses a site rather than merely failing to
 * help it.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://nursecare-ke-five.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "Care Bora Kenya";

/** Absolute URL for a site-relative path — search engines want absolute URLs. */
export const absoluteUrl = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Routes that must never be indexed: anything behind a login, plus the API.
 * Kept here so robots.ts and the per-route `noindex` metadata can't drift apart.
 */
export const PRIVATE_PATHS = [
  "/admin",
  "/vendor",
  "/records",
  "/appointments",
  "/home-visits",
  "/labs",
  "/ambulance",
  "/profile",
  "/consultations",
  "/login",
  "/api",
] as const;

/** `robots` metadata for a page that should stay out of search results entirely. */
export const NOINDEX = { index: false, follow: false } as const;

/**
 * Whether a provider's profile is worth a search result.
 *
 * A listed provider with no specialty and no bio has nothing on their page that
 * the next provider's page doesn't also say — thin, near-duplicate content that
 * dilutes how the rest of the site is judged. Those profiles stay reachable for
 * the people who follow a link, but stay out of the index and the sitemap until
 * the provider fills them in. Used by both so they can't disagree.
 */
export function isIndexableProvider(p: {
  verificationStatus: string;
  specialty: string | null;
  bio: string | null;
}): boolean {
  return p.verificationStatus === "verified" && Boolean(p.specialty?.trim()) && Boolean(p.bio?.trim());
}

/** Collapse stray whitespace and dangling commas typed into free-text fields. */
export function tidy(v: string | null | undefined): string {
  return (v ?? "").replace(/\s+/g, " ").replace(/\s+,/g, ",").trim();
}
