import type { Medication } from "@carebora/shared";
import { clinicalDocumentPdf, documentDate, type DocumentSigner } from "./clinical-document-pdf";

export async function generatePrescriptionPdf(data: {
  prescriptionId: string; issuedAt: Date; expiresAt: Date | null;
  patientName: string; providerName: string; medications: Medication[];
  instructions: string | null; signer: DocumentSigner;
}) {
  const p = await clinicalDocumentPdf({
    title: "PRESCRIPTION", reference: data.prescriptionId.slice(0, 8).toUpperCase(), issuedAt: data.issuedAt, signer: data.signer,
    metadata: [
      ["Prescription ID", data.prescriptionId.slice(0, 8).toUpperCase()],
      ["Issued", documentDate(data.issuedAt)], ["Patient", data.patientName], ["Prescribing Provider", data.providerName],
      ...(data.expiresAt ? [["Expires", documentDate(data.expiresAt)] as [string, string]] : []),
    ],
  });
  p.section("Medications");
  for (const [i, m] of data.medications.entries()) {
    p.text(`${i + 1}. ${m.name}`, { bold: true });
    p.text(`Dosage: ${m.dosage}    Frequency: ${m.frequency}    Duration: ${m.duration}`, { indent: 14, size: 10 });
    if (m.notes) p.text(`Note: ${m.notes}`, { indent: 14, size: 10 });
    p.gap(8);
  }
  if (data.instructions) { p.section("General Instructions"); p.text(data.instructions); }
  return p.finish();
}
