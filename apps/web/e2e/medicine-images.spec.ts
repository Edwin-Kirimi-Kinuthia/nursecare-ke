import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "@carebora/db";
import { test, expect } from "@playwright/test";
import sitemap from "../src/app/sitemap";

test.beforeAll(() => {
  if (!["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error("Disposable local database required");
});

test("medicine responses exclude inline photos; public images are resized, compressed and cacheable", async ({ request }) => {
  const png = await sharp({ create: { width: 1200, height: 900, channels: 3, background: "#234f34" } }).png().toBuffer();
  const source = `data:image/png;base64,${png.toString("base64")}`;
  const org = await db.organization.create({ data: { name: "Image test pharmacy", slug: randomUUID(), type: "pharmacy", status: "approved", branches: { create: { name: "Main", county: "Nairobi", latitude: -1.2864, longitude: 36.8172 } } } });
  const drug = await db.drug.create({ data: { name: `Image medicine ${randomUUID()}`, category: "Image test", imageUrl: source, images: [source], listings: { create: { orgId: org.id, priceKes: 10, stockQty: 100, minOrderQty: 10 } } } });
  try {
    const detail = await request.get(`/api/v1/storefront/drugs/${drug.id}`);
    const publicDrug = (await detail.json()).data;
    expect(publicDrug.imageUrl).toBe(`/media/medicines/${drug.id}/0?v=${drug.updatedAt.getTime()}&format=jpeg`);
    expect(await detail.text()).not.toContain("data:image");
    const catalogue = await request.get(`/api/v1/storefront/drugs?search=${encodeURIComponent(drug.name)}`);
    expect((await catalogue.json()).data.drugs[0].imageUrl).toBe(publicDrug.imageUrl);
    expect(await catalogue.text()).not.toContain("data:image");
    const offers = await request.get(`/api/v1/storefront/drugs/${drug.id}/offers`);
    expect(await offers.text()).not.toContain("data:image");
    const image = await request.get(`${publicDrug.imageUrl.replace("&format=jpeg", "&format=webp")}&w=320`);
    const nativeImage = await request.get(publicDrug.imageUrl);
    expect(nativeImage.headers()["content-type"]).toBe("image/jpeg");
    expect(image.status()).toBe(200); expect(image.headers()["content-type"]).toBe("image/webp");
    expect(image.headers()["cache-control"]).toContain("s-maxage=604800");
    const bytes = await image.body();
    expect((await sharp(bytes).metadata()).width).toBe(320);
    expect(bytes.length).toBeLessThan(png.length);
    expect((await request.get(`${publicDrug.imageUrl.replace("&format=jpeg", "&format=webp")}&w=320`, { headers: { "If-None-Match": image.headers().etag } })).status()).toBe(304);
    expect((await request.get(`${publicDrug.imageUrl}&w=99999`)).status()).toBe(400);
    const html = await (await request.get(`/pharmacy/${drug.id}`)).text();
    const schema = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m => JSON.parse(m[1]));
    const medicine = schema.find(s => Array.isArray(s["@type"]) && s["@type"].includes("Drug"));
    expect(medicine.image).toContain(`/media/medicines/${drug.id}/0`);
    expect(medicine.offers[0]).toMatchObject({ price: 10, priceCurrency: "KES", eligibleQuantity: { minValue: 10 } });
    expect(schema.some(s => s["@type"] === "BreadcrumbList")).toBe(true);
    expect(html).toContain('property="og:image"');
    expect(html).not.toContain("data:image");
    expect((await db.drug.findUniqueOrThrow({ where: { id: drug.id } })).imageUrl).toBe(source);
    await db.drug.update({ where: { id: drug.id }, data: { isActive: false } });
    expect((await request.get(publicDrug.imageUrl)).status()).toBe(404);
  } finally {
    await db.listing.deleteMany({ where: { drugId: drug.id } });
    await db.drug.delete({ where: { id: drug.id } });
    await db.organization.delete({ where: { id: org.id } });
  }
});

test("sitemap includes indexable providers beyond the first fifty", async () => {
  const tag = randomUUID();
  const ids: string[] = [];
  try {
    for (let i=0;i<51;i++) {
      const user = await db.user.create({ data: { fullName: "Sitemap clinician", email: `${tag}-${i}@carebora.test`, role: "doctor", providerProfile: { create: { verificationStatus: "verified", specialty: "Doctor", bio: "Test profile for sitemap coverage." } } } });
      ids.push(user.id);
    }
    const urls = new Set((await sitemap()).map(e => new URL(e.url).pathname));
    for (const id of ids) expect(urls.has(`/providers/${id}`)).toBe(true);
  } finally {
    await db.providerProfile.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});
