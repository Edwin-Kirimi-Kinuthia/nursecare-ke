import { test, expect } from "@playwright/test";

test("PDF download renews an expired session and downloads on the first click", async ({ page }) => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const consultationId = "22222222-2222-4222-8222-222222222222";
  let pdfRequests = 0, renewals = 0;
  await page.route("**/api/v1/notifications**", route => route.fulfill({ json: { data: { notifications: [], unreadCount: 0 } } }));
  await page.route("**/api/v1/auth/me", route => route.fulfill({ json: { data: { id: userId, role: "patient", fullName: "Test patient", email: "test@example.com" } } }));
  await page.route(`**/api/v1/records/${userId}`, route => route.fulfill({ json: { data: { allergies: [], conditions: [], medications: [], documents: [], immunizations: [], vitals: [], consultations: [{ id: consultationId, createdAt: "2026-11-24T10:00:00Z", clinicalRecord: { chiefComplaint: "Follow up" }, prescriptions: [{ id: "p1", medications: [] }], appointment: { provider: { user: { role: "doctor", fullName: "Test doctor" }, specialty: "General practice" }, slot: { startsAt: "2026-11-24T10:00:00Z" } } }] } } }));
  await page.route("**/api/v1/auth/refresh", route => { renewals++; return route.fulfill({ json: { data: {} } }); });
  await page.route(`**/api/v1/consultations/${consultationId}/pdf`, route => {
    pdfRequests++;
    return pdfRequests === 1 ? route.fulfill({ status: 401, json: { error: { message: "Expired session" } } }) : route.fulfill({ contentType: "application/pdf", headers: { "Content-Disposition": 'attachment; filename="consultation.pdf"' }, body: "%PDF-1.4\n%%EOF" });
  });
  await page.goto("/records");
  await page.getByRole("button", { name: "Consultations", exact: true }).click();
  const pdf = page.getByRole("button", { name: "PDF", exact: true });
  await expect(pdf).toBeVisible();
  const downloading = page.waitForEvent("download");
  await pdf.click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("consultation.pdf");
  expect(pdfRequests).toBe(2);
  expect(renewals).toBe(1);
  await expect(pdf).toBeEnabled();
});
