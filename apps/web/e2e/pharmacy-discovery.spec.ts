import { randomUUID } from "node:crypto";
import { db } from "@carebora/db";
import { test, expect } from "@playwright/test";
import sitemap from "../src/app/sitemap";
import { absoluteUrl } from "../src/lib/seo";

test.describe("Public pharmacy discovery", () => {
  test.beforeAll(() => {
    if (!process.env.DATABASE_URL || !["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error("Requires a disposable local database");
  });
  test("categories include offers beyond page one and remain available while filtering; drugs have crawlable pages", async ({ request, page }) => {
    const tag = randomUUID();
    const org = await db.organization.create({ data: { name: "Discovery pharmacy", slug: tag, type: "pharmacy", status: "approved", branches: { create: { name: "Main", county: "Nairobi", town: "Nairobi", addressLine: "Test address", latitude: -1.2864, longitude: 36.8172 } } } });
    const ids: string[] = [];
    try {
      for (let i = 0; i < 52; i++) {
        const d = await db.drug.create({ data: { name: `${tag} Medicine ${i}`, genericName: "Test generic", description: "Catalogue description for discovery testing.", category: i < 51 ? `${tag} Everyday` : `${tag} Last category`, strength: "10mg", form: "tablet", requiresPrescription: true, listings: { create: { orgId: org.id, priceKes: 100 + i, stockQty: 10 } } } });
        ids.push(d.id);
      }
      const listing = await (await request.get("/api/v1/storefront/drugs?limit=50")).json();
      expect(listing.data.drugs).toHaveLength(50);
      expect(listing.data.categories).toEqual(expect.arrayContaining([`${tag} Everyday`, `${tag} Last category`]));
      const filtered = await (await request.get(`/api/v1/storefront/drugs?category=${encodeURIComponent(`${tag} Last category`)}`)).json();
      expect(filtered.data.drugs).toHaveLength(1);
      expect(filtered.data.categories).toEqual(expect.arrayContaining([`${tag} Everyday`, `${tag} Last category`]));
      const otherCounty = await (await request.get("/api/v1/storefront/drugs?county=Mombasa")).json();
      expect(otherCounty.data.categories).not.toContain(`${tag} Last category`);
      const product = await request.get(`/pharmacy/${ids[0]}`);
      expect(product.status()).toBe(200);
      const html = await product.text();
      expect(html).toContain(`${tag} Medicine 0`);
      expect(html).toContain('"@type":["Drug","Product"]');
      expect(html).toContain(`rel="canonical" href="${absoluteUrl(`/pharmacy/${ids[0]}`)}"`);
      expect(html).toContain("Prescription only");
      expect((await sitemap()).some(entry => entry.url === absoluteUrl(`/pharmacy/${ids[0]}`))).toBe(true);
      await page.goto("/pharmacy");
      await expect(page.getByRole("link", { name: `${tag} Medicine 0`, exact: true })).toBeVisible();
      await page.getByRole("button", { name: `${tag} Last category`, exact: true }).click();
      await expect(page.getByRole("link", { name: `${tag} Medicine 51`, exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: `${tag} Everyday`, exact: true })).toBeVisible();
      await db.drug.update({ where: { id: ids[0] }, data: { isActive: false } });
      expect((await request.get(`/pharmacy/${ids[0]}`)).status()).toBe(404);
      expect((await request.get("/pharmacy/invalid-id")).status()).toBe(404);
    } finally {
      await db.listing.deleteMany({ where: { orgId: org.id } });
      await db.drug.deleteMany({ where: { id: { in: ids } } });
      await db.organization.delete({ where: { id: org.id } });
    }
  });
});

test("service entry pages show one back button and real photos; installers are native download links", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#services a img")).toHaveCount(6);
  await page.locator("#services").getByRole("link", { name: /Laboratory tests/ }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find a laboratory in Kenya");
  await expect(page.getByRole("button", { name: "Back", exact: true })).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  await page.goto("/download");
  const installer = page.getByRole("link", { name: /Download apk/ });
  await expect(installer).toHaveAttribute("href", /https:\/\/github.com\/.*\.apk/);
  await expect(installer).toHaveAttribute("download", "");
  await expect(installer).toHaveCSS("background-color", "rgb(35, 79, 52)");
});
