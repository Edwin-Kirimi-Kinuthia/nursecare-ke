import { test, expect, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";

async function showApplication(page: Page, fileUrl: string) {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = {};
    if (path === "/api/v1/auth/me") {
      data = { id: "admin", role: "admin", fullName: "Review Admin", email: "admin@example.test", emailVerified: true };
    } else if (path === "/api/v1/admin/stats") {
      data = {
        users: { total: 1, byRole: { admin: 1 } }, appointments: { total: 0, byStatus: {} },
        orders: { total: 0, byStatus: {} }, homeVisits: { total: 0, byStatus: {} },
        payments: { earningsKes: 0, collectedKes: 0, owedKes: 0, refundedKes: 0,
          bySubject: { appointment: 0, home_visit: 0, order: 0, lab_order: 0, ambulance: 0 } },
      };
    } else if (path === "/api/v1/admin/verifications") {
      data = { providers: [{
        userId: "applicant", specialty: "Nursing", licenceNumber: "TEST-123", verificationStatus: "pending",
        user: { fullName: "Example Applicant", email: "applicant@example.test", avatarUrl: null,
          verificationDocuments: [{ id: "licence", type: "practice_licence", fileUrl }] },
      }], total: 1 };
    }
    await route.fulfill({ json: { data } });
  });
  await page.goto("/admin");
  await page.getByRole("button", { name: "Applications", exact: true }).click();
  await expect(page.getByText("Example Applicant", { exact: true })).toBeVisible();
}

for (const format of ["PDF", "image"] as const) {
  test(`admin can open an applicant's uploaded ${format} licence`, async ({ page, context }) => {
    const pdf = await PDFDocument.create();
    pdf.addPage().drawText("Example practice licence");
    const mime = format === "PDF" ? "application/pdf" : "image/png";
    const base64 = format === "PDF" ? Buffer.from(await pdf.save()).toString("base64")
      : "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
    await showApplication(page, `data:${mime};base64,${base64}`);
    if (format === "PDF") {
      // Headless Chromium downloads PDFs instead of displaying its built-in viewer.
      const downloaded = page.waitForEvent("download");
      await page.getByRole("link", { name: "View licence document" }).click();
      const download = await downloaded;
      expect((await readFile((await download.path())!)).toString("base64")).toBe(base64);
    } else {
      const opened = context.waitForEvent("page");
      await page.getByRole("link", { name: "View licence document" }).click();
      const viewer = await opened;
      await expect(viewer).toHaveURL(/^blob:/);
      await expect.poll(() => viewer.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1);
      await viewer.close();
    }
    await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeVisible();
  });
}

test("invalid licence uploads show an error without navigating away", async ({ page }) => {
  await showApplication(page, "data:application/pdf;base64,invalid!");
  await page.getByRole("link", { name: "View licence document" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Could not open this document" })).toBeVisible();
  await expect(page).toHaveURL(/\/admin$/);
});

test("active document types cannot open in the app's origin", async ({ page }) => {
  await showApplication(page, `data:text/html;base64,${Buffer.from("<h1>Untrusted upload</h1>").toString("base64")}`);
  await page.getByRole("link", { name: "View licence document" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Could not open this document" })).toBeVisible();
  await expect(page).toHaveURL(/\/admin$/);
});
