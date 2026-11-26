import { test, expect } from "@playwright/test";

test("service shortcuts, navigation assistant and desktop back button", async ({ page, request }) => {
  await page.goto("/");
  const services = page.locator("#services");
  await expect(services.locator("a.group")).toHaveCount(6);
  for (const href of ["/online-doctor-kenya", "/pharmacy", "/home-visits-nairobi", "/laboratory-tests-kenya", "/sick-off-sheet-online-kenya", "/ambulance-nairobi"]) await expect(services.locator(`a.group[href="${href}"]`)).toBeVisible();
  await page.getByRole("button", { name: "Open navigation assistant" }).click();
  await page.getByRole("textbox", { name: "Ask for help navigating" }).fill("Where is the pharmacy?");
  const answer = page.waitForResponse(r => r.url().endsWith("/api/v1/ai/navigate") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Send question" }).click();
  expect((await answer).status()).toBe(200);
  await expect(page.getByRole("dialog").getByRole("link", { name: "Pharmacy", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close assistant", exact: true }).click();
  await services.locator('a.group[href="/sick-off-sheet-online-kenya"]').click();
  await expect(page).toHaveURL(/\/sick-off-sheet-online-kenya$/, { timeout: 15000 });
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "../../test-results/homepage-mobile.png", fullPage: true });
  const emergency = await request.post("/api/v1/ai/navigate", { data: { message: "Need an ambulance" } });
  expect((await emergency.json()).data.serviceIds).toEqual(["ambulance"]);
  expect((await request.post("/api/v1/ai/navigate", { data: { message: " " } })).status()).toBe(422);
});
