import type { SickOff } from "@carebora/db";
import { clinicalDocumentPdf, documentDate } from "./clinical-document-pdf";
export { validateSigningImages } from "./clinical-document-pdf";

export async function generateSickOffPdf(c: SickOff) {
  const p = await clinicalDocumentPdf({
    title: "Sick Leave", reference: c.id.slice(0, 8).toUpperCase(), issuedAt: c.issuedAt, signer: c, includeStamp: false,
    metadata: [["Sickoff ID", c.id.slice(0, 8).toUpperCase()], ["Issued", documentDate(c.issuedAt)], ["Patient", c.patientName], ["Provider", c.providerName]],
  });
  p.text(`Subject: Sick Leave Notification for ${c.patientName}`, { bold: true, size: 12 });
  p.gap(25); p.text("Dear Sir/Madam,"); p.gap(18);
  const days = Math.round((+c.throughDate - +c.fromDate) / 86_400_000) + 1;
  p.text(`I am writing on behalf of ${c.patientName}, who was assessed through a teleconsultation on ${documentDate(c.assessedAt)} and has been advised to rest. They will be on sick leave from ${documentDate(c.fromDate)} to ${documentDate(c.throughDate)}, inclusive (${days} day${days === 1 ? "" : "s"}).`);
  if (c.advice) { p.gap(); p.text(c.advice); }
  p.gap(22); p.text("Thank you for your understanding.");
  return p.finish();
}
