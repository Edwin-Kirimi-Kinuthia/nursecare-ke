import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { db } from "@carebora/db";
import { signAccessToken } from "@carebora/core";

test.setTimeout(90_000);
let patientId: string, orgId: string, orderId: string, vendorOrderId: string, token: string;
test.beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Disposable local database required");
  const patient = await db.user.create({ data: { fullName: "Feedback customer", email: `${randomUUID()}@carebora.test`, role: "patient" } });
  patientId = patient.id;
  token = await signAccessToken({ sub: patientId, role: "patient" });
  const org = await db.organization.create({ data: { name: "Feedback pharmacy", slug: randomUUID(), type: "pharmacy", status: "approved" } });
  orgId = org.id;
  const order = await db.order.create({ data: { patientId, totalKes: 100, phoneNumber: "0712345678", deliveryAddress: "Test street, Nairobi" } });
  orderId = order.id;
  const vendorOrder = await db.vendorOrder.create({ data: { orgId, orderId, status: "delivered", subtotalKes: 100, deliveredAt: new Date(), statusHistory: { create: { status: "delivered" } } } });
  vendorOrderId = vendorOrder.id;
});
test.afterAll(async () => {
  if (!patientId) return;
  await db.serviceReview.deleteMany({ where: { patientId } });
  await db.order.deleteMany({ where: { patientId } });
  await db.organization.delete({ where: { id: orgId } });
  await db.user.delete({ where: { id: patientId } });
});

test("phone layout has a compact assistant and pharmacy sort / Rx filters", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pharmacy");
  const help = page.getByRole("button", { name: "Open navigation assistant" });
  await expect(help).toBeEnabled();
  const bounds = await help.boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(48);
  expect(bounds!.height).toBeLessThanOrEqual(48);
  await help.click();
  await expect(page.getByRole("dialog", { name: "Care Bora navigation assistant" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
  const price = page.waitForRequest(r => r.url().includes("/storefront/drugs?") && r.url().includes("sort=price_desc"));
  await page.getByLabel("Sort medicines").selectOption("price_desc");
  await price;
  const otc = page.waitForRequest(r => r.url().includes("/storefront/drugs?") && r.url().includes("requiresPrescription=false"));
  await page.getByLabel("Prescription requirement").selectOption("false");
  await otc;
  await page.screenshot({ path: "/tmp/carebora-pharmacy-mobile-feedback.png", fullPage: true });
});

test("customer rates a delivered pharmacy order and review persists across reloads", async ({ page, request }) => {
  await page.context().addCookies([{ name: "cb_access", value: token, url: test.info().project.use.baseURL! }]);
  await page.goto(`/orders/${orderId}`);
  await expect(page.getByRole("heading", { name: "Rate Feedback pharmacy" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "5 stars", exact: true }).click();
  await page.getByLabel("Review Feedback pharmacy").fill("Helpful and on-time delivery.");
  await page.getByRole("button", { name: "Submit review", exact: true }).click();
  await expect(page.getByText("Thank you! You rated Feedback pharmacy 5/5 stars.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Thank you! You rated Feedback pharmacy 5/5 stars.")).toBeVisible();
  expect(await db.serviceReview.count({ where: { subjectId: vendorOrderId } })).toBe(1);
  const result = await request.get(`/api/v1/organizations/${orgId}/reviews`);
  expect(result.status()).toBe(200);
  expect((await result.json()).data).toMatchObject({ ratingAvg: 5, ratingCount: 1 });
});
