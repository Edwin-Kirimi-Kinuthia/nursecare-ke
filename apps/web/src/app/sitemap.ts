import type { MetadataRoute } from "next";
import { providerService } from "@carebora/core";
import { absoluteUrl, isIndexableProvider } from "@/lib/seo";
import { SERVICE_PAGES_UPDATED } from "@/lib/service-pages";

/**
 * Regenerate hourly. Sitemaps are cached at build time by default, which would
 * freeze the provider list at whatever existed during the last deploy — a
 * clinician who joins today wouldn't be discoverable until the next one.
 */
export const revalidate = 3600;

type Entry = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
  /** When the page's content last meaningfully changed. */
  updated: string;
};

/**
 * Public, crawlable routes. Anything behind a login is deliberately absent.
 *
 * `updated` is a real date, bumped by hand when a page's content changes. The
 * sitemap used to stamp every page "modified now" on every request; search
 * engines notice that the dates never mean anything and stop trusting lastmod
 * for the whole site, including the pages that really did change.
 */
const STATIC_ROUTES: Entry[] = [
  { path: "/", changeFrequency: "weekly", priority: 1, updated: "2026-10-21" },
  { path: "/online-doctor-kenya", changeFrequency: "monthly", priority: 0.9, updated: SERVICE_PAGES_UPDATED },
  { path: "/sick-off-sheet-online-kenya", changeFrequency: "monthly", priority: 0.9, updated: SERVICE_PAGES_UPDATED },
  { path: "/home-visits-nairobi", changeFrequency: "monthly", priority: 0.8, updated: SERVICE_PAGES_UPDATED },
  { path: "/ambulance-nairobi", changeFrequency: "monthly", priority: 0.8, updated: SERVICE_PAGES_UPDATED },
  { path: "/providers", changeFrequency: "daily", priority: 0.9, updated: SERVICE_PAGES_UPDATED },
  { path: "/pharmacy", changeFrequency: "daily", priority: 0.7, updated: "2026-10-21" },
  { path: "/how-we-verify-providers", changeFrequency: "monthly", priority: 0.6, updated: SERVICE_PAGES_UPDATED },
  { path: "/about", changeFrequency: "monthly", priority: 0.6, updated: SERVICE_PAGES_UPDATED },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5, updated: SERVICE_PAGES_UPDATED },
  { path: "/ai", changeFrequency: "monthly", priority: 0.5, updated: "2026-10-21" },
  { path: "/providers/apply", changeFrequency: "monthly", priority: 0.4, updated: "2026-10-08" },
  { path: "/vendors/apply", changeFrequency: "monthly", priority: 0.3, updated: "2026-10-08" },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3, updated: "2026-10-08" },
  { path: "/delete-account", changeFrequency: "yearly", priority: 0.2, updated: "2026-10-16" },
];

/**
 * Includes a URL per provider whose profile is complete enough to be worth a
 * search result — those pages are the long-tail entry points people search for
 * ("paediatrician in Mombasa"). An empty profile is left out (and marked
 * noindex on the page itself, by the same rule) so it doesn't dilute the rest.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: absoluteUrl(r.path),
    lastModified: new Date(r.updated),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // The sitemap must still build when no database is reachable (CI builds with
  // DATABASE_URL empty, and a transient DB blip shouldn't fail a deploy) — fall
  // back to the static routes rather than throwing.
  let providerEntries: MetadataRoute.Sitemap = [];
  try {
    const { providers } = await providerService.list({ limit: 50, offset: 0, verified: true } as never);
    providerEntries = providers.filter(isIndexableProvider).map((p) => ({
      url: absoluteUrl(`/providers/${p.userId}`),
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    providerEntries = [];
  }

  return [...staticEntries, ...providerEntries];
}
