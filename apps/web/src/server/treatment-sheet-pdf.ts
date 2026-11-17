import { clinicalTemplateFor, type ClinicalRecord, type Medication } from "@carebora/shared";
import { clinicalDocumentPdf, documentDate, type DocumentSigner } from "./clinical-document-pdf";

export async function generateTreatmentSheetPdf(data: {
  consultationId: string; role: string | null; record: ClinicalRecord;
  patientName: string; providerName: string; providerSpecialty: string | null;
  date: Date; prescriptions: { medications: Medication[]; instructions: string | null; issuedAt: Date }[];
  signer: DocumentSigner;
}) {
  const tpl = clinicalTemplateFor(data.role);
  const p = await clinicalDocumentPdf({
    title: tpl.title.toUpperCase(), reference: data.consultationId.slice(0, 8).toUpperCase(), issuedAt: data.date, signer: data.signer,
    metadata: [["Record ID", data.consultationId.slice(0, 8).toUpperCase()], ["Issued", documentDate(data.date)], ["Patient", data.patientName], ["Provider", data.providerName]],
  });
  let content = false;
  for (const s of tpl.sections) {
    const value = (data.record[s.key] ?? "").trim();
    if (value) { p.section(s.label); p.text(value); content = true; }
  }
  if (!content) p.text("No clinical documentation recorded for this consultation.");
  for (const rx of data.prescriptions) {
    p.section("Prescription");
    for (const [i, m] of rx.medications.entries()) {
      p.text(`${i + 1}. ${m.name}`, { bold: true });
      p.text(`Dosage: ${m.dosage}    Frequency: ${m.frequency}    Duration: ${m.duration}`, { indent: 14, size: 10 });
      if (m.notes) p.text(m.notes, { indent: 14, size: 10 });
      p.gap(6);
    }
    if (rx.instructions) p.text(rx.instructions);
  }
  return p.finish();
}
