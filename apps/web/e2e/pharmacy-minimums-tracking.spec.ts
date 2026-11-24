import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { db } from "@carebora/db";
import { signAccessToken } from "@carebora/core";

const tag = randomUUID();
const users: string[] = [], orgs: string[] = [], drugs: string[] = [];
let patientToken: string, adminToken: string, vendorToken: string, otherToken: string;
let patientId: string, orgId: string, otherOrgId: string, listingId: string, otherListingId: string, bottleId: string;
let drugName: string, orderId: string, vendorOrderId: string, paymentId: string, gatewayRef: string;
const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
const checkout = (qty: number) => ({ items: [{ listingId, qty }], phoneNumber: "0712345678", deliveryAddress: "Test building, Nairobi" });
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  if (!process.env.DATABASE_URL || !["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error("Requires a disposable local database");
  const tokens: string[] = [];
  for (const role of ["patient", "admin", "vendor", "vendor"] as const) {
    const user = await db.user.create({ data: { fullName: `Pharmacy ${role}`, role, email: `${users.length}-${tag}@example.com`, emailVerifiedAt: new Date() } });
    users.push(user.id); tokens.push(await signAccessToken({ sub: user.id, role }));
  }
  [patientToken, adminToken, vendorToken, otherToken] = tokens; patientId = users[0];
  for (let i = 0; i < 2; i++) {
    const org = await db.organization.create({ data: { name: `Test pharmacy ${i}`, slug: `${tag}-${i}`, type: "pharmacy", status: "approved", members: { create: { userId: users[2+i], role: "owner" } }, branches: { create: { name: "Main", county: "Nairobi", town: "Nairobi", latitude: -1.2864, longitude: 36.8172, isActive: true } } } });
    orgs.push(org.id);
  }
  [orgId, otherOrgId] = orgs;
  const tablet = await db.drug.create({ data: { name: `Tablet ${tag}`, form: "tablet", category: "Pain Relief" } });
  const bottle = await db.drug.create({ data: { name: `Suspension ${tag}`, form: "suspension", category: "Supplies" } });
  drugName = tablet.name; drugs.push(tablet.id, bottle.id);
  const listing = await db.listing.create({ data: { orgId, drugId: tablet.id, priceKes: 5, stockQty: 60, minOrderQty: 10 } }); listingId = listing.id;
  const other = await db.listing.create({ data: { orgId: otherOrgId, drugId: tablet.id, priceKes: 7, stockQty: 100, minOrderQty: 20 } }); otherListingId = other.id;
  const b = await db.listing.create({ data: { orgId, drugId: bottle.id, priceKes: 100, stockQty: 5 } }); bottleId = b.id;
});
test.afterAll(async () => {
  if (!users.length) return;
  await db.order.deleteMany({ where: { patientId: { in: users } } });
  await db.payment.deleteMany({ where: { patientId: { in: users } } });
  await db.auditLog.deleteMany({ where: { actorId: { in: users } } });
  await db.listing.deleteMany({ where: { drugId: { in: drugs } } });
  await db.drug.deleteMany({ where: { id: { in: drugs } } });
  await db.organization.deleteMany({ where: { id: { in: orgs } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
});

test("minimums persist per pharmacy, reject invalid values, and prices remain per unit", async ({ request }) => {
  for (const minOrderQty of [0, 1.5, 101]) expect((await request.patch(`/api/v1/vendor/listings/${listingId}`, { headers: headers(vendorToken), data: { minOrderQty } })).status()).toBe(422);
  expect((await request.patch(`/api/v1/vendor/listings/${listingId}`, { headers: headers(otherToken), data: { minOrderQty: 1 } })).status()).toBe(404);
  const changed = await request.patch(`/api/v1/vendor/listings/${listingId}`, { headers: headers(vendorToken), data: { minOrderQty: 12 } });
  expect(changed.status()).toBe(200); expect((await changed.json()).data.minOrderQty).toBe(12);
  await request.patch(`/api/v1/vendor/listings/${listingId}`, { headers: headers(vendorToken), data: { minOrderQty: 10 } });
  expect((await db.listing.findUniqueOrThrow({ where: { id: otherListingId } })).minOrderQty).toBe(20);
  const catalogue = (await (await request.get(`/api/v1/storefront/drugs?search=${encodeURIComponent(drugName)}`)).json()).data.drugs[0];
  expect(catalogue).toMatchObject({ minOrderQty: 10, form: "tablet", unitPriceKes: 5 });
  // The listing's database default preserves one-bottle purchasing.
  expect((await db.listing.findUniqueOrThrow({ where: { id: bottleId } })).minOrderQty).toBe(1);
});

test("admin catalogue edits retain the house pharmacy minimum", async ({ request, page }) => {
  const hadHouse = await db.organization.findUnique({ where: { slug: "care-bora-pharmacy" } });
  const added = await request.post("/api/v1/admin/drugs", { headers: headers(adminToken), data: { name: `Admin medicine ${tag}`, category: "Pain Relief", form: "tablet", priceKes: 10, stockQty: 100, minOrderQty: 12 } });
  expect(added.status()).toBe(201); const d = (await added.json()).data; drugs.push(d.id);
  if (!hadHouse) orgs.push((await db.organization.findUniqueOrThrow({ where: { slug: "care-bora-pharmacy" } })).id);
  expect(d.minOrderQty).toBe(12);
  await page.context().addCookies([{ name: "cb_access", value: adminToken, url: test.info().project.use.baseURL! }]);
  await page.goto("/admin"); await page.getByRole("button", { name: "Pharmacy", exact: true }).click();
  await page.getByRole("textbox", { name: "Search the catalogue", exact: true }).fill(d.name);
  await page.getByRole("button", { name: `Edit ${d.name}`, exact: true }).click();
  await expect(page.getByLabel("Minimum order quantity (units)")).toHaveValue("12");
  await page.getByLabel("Minimum order quantity (units)").fill("16");
  const saved = page.waitForResponse(r => r.url().endsWith(`/admin/drugs/${d.id}`) && r.request().method() === "PATCH");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await saved).status()).toBe(200);
  await page.getByRole("button", { name: `Edit ${d.name}`, exact: true }).click();
  await expect(page.getByLabel("Minimum order quantity (units)")).toHaveValue("16");
});

test("cart adds the minimum, increases by units, and removes a minimum-size line on decrement", async ({ page }) => {
  await page.goto(`/pharmacy/${drugs[0]}`);
  await expect(page.getByText("KES 5 / tablet", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add to cart", exact: true }).first().click();
  await page.getByRole("button", { name: /cart/i }).first().click();
  const cart = page.getByRole("dialog", { name: "Shopping cart" });
  await expect(cart.getByText("KES 50", { exact: true })).toBeVisible();
  await cart.getByRole("button", { name: "+", exact: true }).click();
  await expect(cart.getByText("KES 55", { exact: true })).toBeVisible();
  await cart.getByRole("button", { name: "−", exact: true }).click();
  await expect(cart.getByText("KES 50", { exact: true })).toBeVisible();
  await cart.getByRole("button", { name: "−", exact: true }).click();
  await expect(cart.getByText(/Your cart is empty/)).toBeVisible();
});

test("checkout rejects undersized or oversized quantities before starting payment and merges duplicate lines", async ({ request }) => {
  for (const qty of [1, 9]) {
    const response = await request.post("/api/v1/orders", { headers: headers(patientToken), data: checkout(qty) });
    expect(response.status()).toBe(400); expect((await response.json()).error.message).toContain("Minimum order");
  }
  expect(await db.payment.count({ where: { patientId } })).toBe(0);
  expect((await request.post("/api/v1/orders", { headers: headers(patientToken), data: { ...checkout(10), items: [{ listingId, qty: 60 }, { listingId, qty: 60 }] } })).status()).toBe(400);
  expect((await request.post("/api/v1/orders", { headers: headers(patientToken), data: checkout(80) })).status()).toBe(409);
  const placed = await request.post("/api/v1/orders", { headers: headers(patientToken), data: { ...checkout(10), items: [{ listingId, qty: 6 }, { listingId, qty: 4 }] } });
  expect(placed.status()).toBe(201); const o = (await placed.json()).data;
  orderId = o.id; vendorOrderId = o.vendorOrders[0].id; paymentId = o.payment.id; gatewayRef = o.payment.gatewayRef;
  expect(o.totalKes).toBe(50); expect(o.vendorOrders[0].items).toHaveLength(1); expect(o.vendorOrders[0].items[0].qty).toBe(10);
  expect((await db.listing.findUniqueOrThrow({ where: { id: listingId } })).stockQty).toBe(50);
  expect((await request.patch(`/api/v1/admin/orders/${vendorOrderId}`, { headers: headers(adminToken), data: { status: "processing" } })).status()).toBe(400);
});

test("paid orders can be updated by admins and their vendor, and clients see each delivery stage", async ({ request, browser }) => {
  expect((await request.post("/api/v1/payments/till/submit", { headers: headers(patientToken), data: { gatewayRef, code: `MIN${tag.replace(/-/g, "").slice(0,9)}` } })).status()).toBe(200);
  expect((await request.post("/api/v1/admin/payments/verifications", { headers: headers(adminToken), data: { id: paymentId, approve: true } })).status()).toBe(200);
  expect((await request.patch(`/api/v1/admin/orders/${vendorOrderId}`, { headers: headers(patientToken), data: { status: "processing" } })).status()).toBe(403);
  expect((await request.patch(`/api/v1/vendor/orders/${vendorOrderId}`, { headers: headers(otherToken), data: { status: "processing" } })).status()).toBe(404);
  expect((await request.patch(`/api/v1/admin/orders/${vendorOrderId}`, { headers: headers(adminToken), data: { status: "delivered" } })).status()).toBe(400);
  const contexts = await Promise.all([patientToken, adminToken, vendorToken].map(async value => { const ctx = await browser.newContext(); await ctx.addCookies([{ name: "cb_access", value, url: test.info().project.use.baseURL! }]); return ctx; }));
  try {
    const client = await contexts[0].newPage(), admin = await contexts[1].newPage(), vendor = await contexts[2].newPage();
    await client.goto("/orders"); await client.getByRole("link", { name: /Track order/ }).click();
    await expect(client.getByRole("status")).toHaveText("Paid");
    await admin.goto("/admin"); await admin.getByRole("button", { name: "Orders", exact: true }).click();
    await vendor.goto("/vendor"); await vendor.getByRole("button", { name: "Orders", exact: true }).click();
    for (const [actor, label, expected] of [[admin, "Mark preparing", "Preparing"], [vendor, "Mark dispatched", "Dispatched"], [admin, "Mark in delivery", "In delivery"], [vendor, "Mark delivered", "Delivered"]] as const) {
      await actor.getByRole("button", { name: "Refresh orders", exact: true }).click();
      const response = actor.waitForResponse(r => r.url().endsWith(`/orders/${vendorOrderId}`) && r.request().method() === "PATCH");
      await actor.getByRole("button", { name: label, exact: true }).click(); expect((await response).status()).toBe(200);
      await client.getByRole("button", { name: "Refresh delivery status", exact: true }).click(); await expect(client.getByRole("status")).toHaveText(expected);
    }
    const order = (await (await request.get(`/api/v1/orders/${orderId}`, { headers: headers(patientToken) })).json()).data;
    expect(order.vendorOrders[0].statusHistory.map((e: { status: string }) => e.status)).toEqual(["pending", "paid", "processing", "dispatched", "in_delivery", "delivered"]);
    expect(order.vendorOrders[0].inDeliveryAt).toBeTruthy(); expect(order.vendorOrders[0].deliveredAt).toBeTruthy();
    expect((await request.get(`/api/v1/orders/${orderId}`, { headers: headers(otherToken) })).status()).toBe(403);
    expect((await request.patch(`/api/v1/admin/orders/${vendorOrderId}`, { headers: headers(adminToken), data: { status: "processing" } })).status()).toBe(400);
  } finally { await Promise.all(contexts.map(c => c.close())); }
});

test("status retries do not duplicate history or restore cancelled stock twice", async ({ request }) => {
  const placed = (await (await request.post("/api/v1/orders", { headers: headers(patientToken), data: checkout(10) })).json()).data;
  await request.post("/api/v1/payments/till/submit", { headers: headers(patientToken), data: { gatewayRef: placed.payment.gatewayRef, code: `END${tag.replace(/-/g, "").slice(0,9)}` } });
  await request.post("/api/v1/admin/payments/verifications", { headers: headers(adminToken), data: { id: placed.payment.id, approve: true } });
  const id = placed.vendorOrders[0].id;
  const results = await Promise.all([1,2].map(() => request.patch(`/api/v1/admin/orders/${id}`, { headers: headers(adminToken), data: { status: "cancelled" } })));
  for (const result of results) expect([200,409]).toContain(result.status());
  expect((await db.listing.findUniqueOrThrow({ where: { id: listingId } })).stockQty).toBe(50);
  expect(await db.vendorOrderStatusEvent.count({ where: { vendorOrderId: id, status: "cancelled" } })).toBe(1);
});

test("a stale cart requires an explicit quantity adjustment and offers disappear below their minimum stock", async ({ request, page }) => {
  await db.listing.update({ where: { id: otherListingId }, data: { stockQty: 19 } });
  const offers = (await (await request.get(`/api/v1/storefront/drugs/${drugs[0]}/offers`)).json()).data.offers;
  expect(offers.some((offer: { listingId: string }) => offer.listingId === otherListingId)).toBe(false);
  await db.listing.update({ where: { id: otherListingId }, data: { stockQty: 100 } });
  await page.addInitScript(({ id }) => localStorage.setItem("carebora_cart", JSON.stringify({ [id]: 1 })), { id: listingId });
  await page.goto(`/pharmacy/${drugs[0]}`); await page.getByRole("button", { name: /cart/i }).first().click();
  const cart = page.getByRole("dialog", { name: "Shopping cart" });
  await expect(cart.getByRole("alert")).toContainText("minimum and available stock");
  await expect(cart.getByText("KES 5", { exact: true })).toBeVisible();
  await cart.getByRole("button", { name: "+", exact: true }).click();
  await expect(cart.getByText("KES 50", { exact: true })).toBeVisible();
  await expect(cart.getByRole("alert")).toHaveCount(0);
});

test("each pharmacy in one checkout has its own minimum and delivery progress", async ({ request, page }) => {
  const data = { ...checkout(10), items: [{ listingId, qty: 10 }, { listingId: otherListingId, qty: 20 }] };
  const invalid = await request.post("/api/v1/orders", { headers: headers(patientToken), data: { ...data, items: [{ listingId, qty: 10 }, { listingId: otherListingId, qty: 1 }] } });
  expect(invalid.status()).toBe(400);
  const response = await request.post("/api/v1/orders", { headers: headers(patientToken), data });
  expect(response.status()).toBe(201); const o = (await response.json()).data;
  expect(o.totalKes).toBe(190); expect(o.vendorOrders).toHaveLength(2);
  await request.post("/api/v1/payments/till/submit", { headers: headers(patientToken), data: { gatewayRef: o.payment.gatewayRef, code: `MIX${tag.replace(/-/g, "").slice(0,9)}` } });
  await request.post("/api/v1/admin/payments/verifications", { headers: headers(adminToken), data: { id: o.payment.id, approve: true } });
  const first = o.vendorOrders.find((v: { orgId: string }) => v.orgId === orgId);
  expect((await request.patch(`/api/v1/admin/orders/${first.id}`, { headers: headers(adminToken), data: { status: "processing" } })).status()).toBe(200);
  await page.context().addCookies([{ name: "cb_access", value: patientToken, url: test.info().project.use.baseURL! }]);
  await page.goto(`/orders/${o.id}`);
  await expect(page.getByRole("region", { name: "Test pharmacy 0 delivery progress" }).getByRole("status")).toHaveText("Preparing");
  await expect(page.getByRole("region", { name: "Test pharmacy 1 delivery progress" }).getByRole("status")).toHaveText("Paid");
});
