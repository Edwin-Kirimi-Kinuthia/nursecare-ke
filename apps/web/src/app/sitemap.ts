import type { MetadataRoute } from "next";
import { providerService } from "@carebora/core";
import { absoluteUrl } from "@/lib/seo";

/**
 * Regenerate hourly. Sitemaps are cached at build time by default, which would
 * freeze the provider list at whatever existed during the last deploy — a
 * clinician who joins today wouldn't be discoverable until the next one.
 */
export const revalidate = 3600;

/** Public, crawlable routes. Anything behind a login is deliberately absent. */
const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/providers", changeFrequency: "daily", priority: 0.9 },
  { path: "/pharmacy", changeFrequency: "daily", priority: 0.9 },
  { path: "/providers/apply", changeFrequency: "monthly", priority: 0.5 },
  { path: "/vendors/apply", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/ai", changeFrequency: "monthly", priority: 0.4 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
];

/**
 * Served at /sitemap.xml.
 *
 * Includes a URL per verified provider — those profile pages are public and are
 * the long-tail entry points people actually search for ("paediatrician in
 * Mombasa"), so leaving them out would waste the best content on the site.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: absoluteUrl(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // The sitemap must still build when no database is reachable (CI builds with
  // DATABASE_URL empty, and a transient DB blip shouldn't fail a deploy) — fall
  // back to the static routes rather than throwing.
  let providerEntries: MetadataRoute.Sitemap = [];
  try {
    const { providers } = await providerService.list({ limit: 50, offset: 0, verified: true });
    providerEntries = providers.map((p) => ({
      url: absoluteUrl(`/providers/${p.userId}`),
      lastModified: p.updatedAt ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    providerEntries = [];
  }

  return [...staticEntries, ...providerEntries];
}
