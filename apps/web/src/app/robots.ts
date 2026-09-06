import type { MetadataRoute } from "next";
import { absoluteUrl, PRIVATE_PATHS } from "@/lib/seo";

/**
 * Served at /robots.txt.
 *
 * Everything behind a login is disallowed — those pages render a redirect or a
 * skeleton to a crawler, so indexing them would spend crawl budget to produce
 * near-empty, duplicate results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_PATHS.map((p) => `${p}/`),
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
