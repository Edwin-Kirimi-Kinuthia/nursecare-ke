import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { Medication } from "@carebora/shared";

interface PrescriptionData {
  prescriptionId: string;
  issuedAt: Date;
  expiresAt: Date | null;
  patientName: string;
  providerName: string;
  medications: Medication[];
  instructions: string | null;
}

const TEAL = rgb(0.02, 0.53, 0.49);
const DARK = rgb(0.1, 0.1, 0.1);
const GRAY = rgb(0.45, 0.45, 0.45);

/** Generate a CareBora prescription PDF and return the bytes. */
export async function generatePrescriptionPdf(data: PrescriptionData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;

  // ── Header ──────────────────────────────────────────────────────────────────
  page.drawText("CareBora", { x: 50, y, size: 28, font: bold, color: TEAL });
  y -= 18;
  page.drawText("Quality care, made accessible.", { x: 50, y, size: 10, font: regular, color: GRAY });
  y -= 8;
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: TEAL });
  y -= 24;

  page.drawText("PRESCRIPTION", { x: 50, y, size: 18, font: bold, color: DARK });
  y -= 20;

  // ── Meta ─────────────────────────────────────────────────────────────────────
  const meta = [
    ["Prescription ID", data.prescriptionId.slice(0, 8).toUpperCase()],
    ["Issued", data.issuedAt.toLocaleDateString("en-KE", { dateStyle: "long" })],
    ...(data.expiresAt
      ? [["Expires", data.expiresAt.toLocaleDateString("en-KE", { dateStyle: "long" })]]
      : []),
    ["Patient", data.patientName],
    ["Prescribing Provider", data.providerName],
  ] as [string, string][];

  for (const [label, value] of meta) {
    page.drawText(`${label}:`, { x: 50, y, size: 10, font: bold, color: DARK });
    page.drawText(value, { x: 200, y, size: 10, font: regular, color: DARK });
    y -= 16;
  }

  y -= 12;
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: GRAY });
  y -= 16;

  // ── Medications ──────────────────────────────────────────────────────────────
  page.drawText("Medications", { x: 50, y, size: 13, font: bold, color: TEAL });
  y -= 18;

  for (let i = 0; i < data.medications.length; i++) {
    const med = data.medications[i];
    page.drawText(`${i + 1}. ${med.name}`, { x: 50, y, size: 11, font: bold, color: DARK });
    y -= 14;
    page.drawText(`Dosage: ${med.dosage}   Frequency: ${med.frequency}   Duration: ${med.duration}`, {
      x: 65, y, size: 10, font: regular, color: DARK,
    });
    y -= 13;
    if (med.notes) {
      page.drawText(`Note: ${med.notes}`, { x: 65, y, size: 9, font: regular, color: GRAY });
      y -= 13;
    }
    y -= 6;
  }

  // ── General instructions ─────────────────────────────────────────────────────
  if (data.instructions) {
    y -= 6;
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: GRAY });
    y -= 16;
    page.drawText("General Instructions", { x: 50, y, size: 11, font: bold, color: DARK });
    y -= 14;
    // Simple word-wrap for instructions
    const words = data.instructions.split(" ");
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (regular.widthOfTextAtSize(candidate, 10) > width - 100) {
        page.drawText(line, { x: 50, y, size: 10, font: regular, color: DARK });
        y -= 13;
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) {
      page.drawText(line, { x: 50, y, size: 10, font: regular, color: DARK });
      y -= 13;
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  const footerY = 40;
  page.drawLine({ start: { x: 50, y: footerY + 14 }, end: { x: width - 50, y: footerY + 14 }, thickness: 0.5, color: GRAY });
  page.drawText("This is a digitally issued prescription. Verify at carebora.co.ke", {
    x: 50, y: footerY, size: 8, font: regular, color: GRAY,
  });

  return doc.save();
}
