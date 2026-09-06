import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * SEO plumbing. These break silently — nothing errors, traffic just quietly
 * fails to arrive — so they're asserted rather than eyeballed once.
 *
 * The two that actually cause damage (rather than merely missing an
 * opportunity) are a private page becoming indexable, and a canonical or
 * sitemap pointing at the wrong host.
 *
 * Fetches HTML directly rather than driving a browser, matching the rest of
 * this suite — the assertions are all on <head> tags, which are in the server
 * response and need no rendering.
 */

const attr = (html: string, selector: RegExp) => html.match(selector)?.[1] ?? null;
const titleOf = (html: string) => attr(html, /<title>([^<]*)<\/title>/);
const canonicalOf = (html: string) => attr(html, /<link rel="canonical" href="([^"]*)"/);
const metaOf = (html: string, name: string) =>
  attr(html, new RegExp(`<meta name="${name}" content="([^"]*)"`));

async function getHtml(request: APIRequestContext, path: string) {
  const res = await request.get(path);
  expect(res.status(), `${path} should render`).toBe(200);
  return res.text();
}

test.describe("SEO", () => {
  test("robots.txt allows the site, blocks private areas, and links the sitemap", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();

    expect(body).toContain("User-Agent: *");
    expect(body).toContain("Allow: /");
    expect(body).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);

    // Nothing behind a login should be crawlable.
    for (const p of ["/admin/", "/vendor/", "/records/", "/appointments/", "/profile/", "/api/"]) {
      expect(body, `${p} must be disallowed`).toContain(`Disallow: ${p}`);
    }
  });

  test("sitemap.xml is valid and lists the public pages", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("xml");
    const xml = await res.text();

    expect(xml).toContain("<urlset");
    for (const p of ["/providers", "/pharmacy", "/vendors/apply"]) {
      expect(xml, `${p} should be in the sitemap`).toContain(`${p}</loc>`);
    }
    // Private routes must never be advertised for crawling.
    for (const p of ["/admin", "/records", "/login"]) {
      expect(xml, `${p} must not be in the sitemap`).not.toContain(`${p}</loc>`);
    }
  });

  test("public pages have unique titles, descriptions and self-referencing canonicals", async ({ request }) => {
    const seen = new Map<string, string>();

    for (const path of ["/", "/providers", "/pharmacy", "/vendors/apply", "/ai"]) {
      const html = await getHtml(request, path);

      const title = titleOf(html);
      expect(title, `${path} needs a title`).toBeTruthy();
      expect(title!.length).toBeGreaterThan(10);
      expect(seen.has(title!), `${path} duplicates the title of ${seen.get(title!)}`).toBe(false);
      seen.set(title!, path);

      const canonical = canonicalOf(html);
      expect(canonical, `${path} needs a canonical`).toBeTruthy();
      expect(
        canonical!.endsWith(path === "/" ? "" : path),
        `${path} canonical should point at itself, got ${canonical}`,
      ).toBe(true);

      const description = metaOf(html, "description");
      expect(description, `${path} needs a description`).toBeTruthy();
      expect(description!.length).toBeGreaterThan(50);
    }
  });

  test("pages behind a login are noindex", async ({ request }) => {
    for (const path of ["/records", "/admin", "/vendor", "/appointments", "/profile", "/login"]) {
      const html = await getHtml(request, path);
      expect(metaOf(html, "robots"), `${path} must be noindex`).toContain("noindex");
    }
  });

  test("the homepage carries organisation and website structured data", async ({ request }) => {
    const html = await getHtml(request, "/");
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) =>
      JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#x27;/g, "'")),
    );
    expect(blocks.length).toBeGreaterThanOrEqual(2);

    const org = blocks.find((d) => d["@type"] === "MedicalOrganization");
    expect(org, "a MedicalOrganization node is what classifies this as a health business").toBeTruthy();
    expect(org.name).toBeTruthy();
    expect(org.telephone).toBeTruthy();
    expect(org.areaServed.name).toBe("Kenya");
    expect(org.availableService.length).toBeGreaterThan(3);

    expect(blocks.find((d) => d["@type"] === "WebSite")).toBeTruthy();
  });

  test("a provider profile gets its own title, description and canonical", async ({ request }) => {
    const res = await request.get("/api/v1/providers");
    const { data } = await res.json();
    test.skip(data.providers.length === 0, "needs at least one seeded provider");
    const provider = data.providers[0];

    const html = await getHtml(request, `/providers/${provider.userId}`);

    // The clinician's name belongs in the title — that's the searchable part.
    const surname = provider.user.fullName.split(" ").pop()!;
    expect(titleOf(html)).toContain(surname);
    expect(canonicalOf(html)).toContain(`/providers/${provider.userId}`);
    expect(metaOf(html, "description")!.length).toBeGreaterThan(30);
  });

  test("the web manifest is served and installable", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const m = await res.json();
    expect(m.name).toBeTruthy();
    expect(m.start_url).toBe("/");
    expect(m.icons.length).toBeGreaterThan(0);
  });
});
