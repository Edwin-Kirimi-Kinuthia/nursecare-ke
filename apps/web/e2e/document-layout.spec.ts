import { test, expect } from "@playwright/test";
import { PDFDocument, PDFRawStream, PDFName, PDFDict, decodePDFRawStream } from "pdf-lib";
import { clinicalDocumentPdf, stampDate } from "../src/server/clinical-document-pdf";
import { generatePrescriptionPdf } from "../src/server/prescription-pdf";
import { generateTreatmentSheetPdf } from "../src/server/treatment-sheet-pdf";
import { TEST_DOCUMENT_SIGNATURE } from "./support/document-signature";

const signer = { providerName: "Dr Example Provider", licenceBody: "Example Council", licenceNumber: "TEST-1234", signatureDataUrl: TEST_DOCUMENT_SIGNATURE };

function textStreams(doc: PDFDocument) {
  return doc.context.enumerateIndirectObjects().flatMap(([, object]) => {
    if (!(object instanceof PDFRawStream) || object.dict.get(PDFName.of("Subtype"))?.toString() === "/Image") return [];
    return [Buffer.from(decodePDFRawStream(object).decode()).toString("latin1")];
  }).join("\n");
}
const hex = (text: string) => Buffer.from(text, "ascii").toString("hex").toUpperCase();

test("round stamp uses Nairobi's current date without changing the original issue date", async () => {
  const now = new Date("2026-11-17T22:30:00Z");
  const original = new Date("2026-10-16T10:00:00Z");
  expect(stampDate(now)).toBe("18 NOV 2026");
  const p = await clinicalDocumentPdf({ title: "Sick Leave", reference: "SAMPLE", issuedAt: original, metadata: [["Issued", "16 October 2026"]], signer, generatedAt: now });
  p.text("Example certificate body.");
  const document = await PDFDocument.load(await p.finish(), { updateMetadata: false });
  expect(document.getCreationDate()).toEqual(original);
  expect(document.getModificationDate()).toEqual(now);
  const text = textStreams(document);
  for (const value of ["18 NOV 2026", "16 October 2026", "Example Council No. TEST-1234", "CareBora"]) expect(text).toContain(hex(value));
  const images = document.getPage(0).node.Resources()!.lookup(PDFName.of("XObject"), PDFDict);
  expect(images.keys().length).toBeGreaterThanOrEqual(2); // Actual logo and signature, not text placeholders.
});

test("long prescriptions and clinical records paginate with a signature and stamp on every page", async () => {
  const issuedAt = new Date("2026-10-16T10:00:00Z");
  const medications = Array.from({ length: 25 }, (_, i) => ({ name: `Example medicine ${i + 1}`, dosage: "100 mg", frequency: "Twice daily", duration: "5 days", notes: "An example instruction that must not overflow into the signature area." }));
  const prescriptions = await generatePrescriptionPdf({ prescriptionId: "example-rx", issuedAt, expiresAt: null, patientName: "Example Patient", providerName: signer.providerName, medications, instructions: "Review as advised.", signer });
  const treatment = await generateTreatmentSheetPdf({ consultationId: "example-session", role: "doctor", record: { presentingComplaint: "Long clinical paragraph. ".repeat(350), diagnosis: "EXAMPLEENDMARKER" }, patientName: "Example Patient", providerName: signer.providerName, providerSpecialty: "General practice", date: issuedAt, prescriptions: [], signer });
  for (const bytes of [prescriptions, treatment]) {
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
    for (const page of doc.getPages()) expect(page.node.Resources()!.lookup(PDFName.of("XObject"), PDFDict).keys().length).toBeGreaterThanOrEqual(2);
    const stamp = textStreams(doc).match(new RegExp(hex(stampDate(new Date())), "g"));
    expect(stamp?.length).toBe(doc.getPageCount());
  }
  expect(textStreams(await PDFDocument.load(treatment))).toContain(hex("EXAMPLEENDMARKER"));
});
