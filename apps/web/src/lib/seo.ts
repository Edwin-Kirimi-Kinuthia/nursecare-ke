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
