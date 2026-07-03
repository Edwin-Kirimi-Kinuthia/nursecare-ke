import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { clinicalTemplateFor, type ClinicalRecord, type Medication } from "@carebora/shared";

interface RxItem {
  medications: Medication[];
  instructions: string | null;
  issuedAt: Date;
}

interface TreatmentSheetData {
  consultationId: string;
  role: string | null;
  record: ClinicalRecord;
  patientName: string;
  providerName: string;
  providerSpecialty: string | null;
  date: Date;
  prescriptions: RxItem[];
}

const TEAL = rgb(0.02, 0.53, 0.49);
const DARK = rgb(0.1, 0.1, 0.1);
const GRAY = rgb(0.45, 0.45, 0.45);

const MARGIN = 50;
const PAGE_W = 595;
const PAGE_H = 842; // A4
const BOTTOM = 60;

/** Generate a CareBora treatment-sheet / cardex / assessment PDF. */
export async function generateTreatmentSheetPdf(data: TreatmentSheetData): Promise<Uint8Array> {
  const tpl = clinicalTemplateFor(data.role);
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 50;

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - 50;
  };
  const ensure = (needed: number) => {
    if (y - needed < BOTTOM) newPage();
  };

  /** Draw word-wrapped text; returns nothing, advances y. */
  const wrap = (text: string, opts: { x: number; size: number; font: PDFFont; color: ReturnType<typeof rgb>; lineGap?: number }) => {
    const maxW = PAGE_W - MARGIN - opts.x;
    const lineH = opts.size + (opts.lineGap ?? 4);
    for (const rawLine of text.split("\n")) {
      if (rawLine.trim() === "") { ensure(lineH); y -= lineH; continue; }
      const words = rawLine.split(" ");
      let line = "";
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (opts.font.widthOfTextAtSize(candidate, opts.size) > maxW && line) {
          ensure(lineH);
          page.drawText(line, { x: opts.x, y, size: opts.size, font: opts.font, color: opts.color });
          y -= lineH;
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) {
        ensure(lineH);
        page.drawText(line, { x: opts.x, y, size: opts.size, font: opts.font, color: opts.color });
        y -= lineH;
      }
    }
  };

  // ── Header ──────────────────────────────────────────────────────────────────
  page.drawText("CareBora", { x: MARGIN, y, size: 28, font: bold, color: TEAL });
  y -= 18;
  page.drawText("Quality care, made accessible.", { x: MARGIN, y, size: 10, font: regular, color: GRAY });
  y -= 8;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: TEAL });
  y -= 26;

  page.drawText(tpl.title.toUpperCase(), { x: MARGIN, y, size: 18, font: bold, color: DARK });
  y -= 22;

  // ── Meta ─────────────────────────────────────────────────────────────────────
  const meta: [string, string][] = [
    ["Patient", data.patientName],
    ["Provider", data.providerSpecialty ? `${data.providerName} (${data.providerSpecialty})` : data.providerName],
    ["Date", data.date.toLocaleDateString("en-KE", { dateStyle: "long" })],
    ["Record ID", data.consultationId.slice(0, 8).toUpperCase()],
  ];
  for (const [label, value] of meta) {
    page.drawText(`${label}:`, { x: MARGIN, y, size: 10, font: bold, color: DARK });
    page.drawText(value, { x: 170, y, size: 10, font: regular, color: DARK });
    y -= 16;
  }
  y -= 6;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: GRAY });
  y -= 20;

  // ── Sections (in template order) ──────────────────────────────────────────────
  let anyContent = false;
  for (const section of tpl.sections) {
    const value = (data.record[section.key] ?? "").trim();
    if (!value) continue;
    anyContent = true;
    ensure(28);
    page.drawText(section.label.toUpperCase(), { x: MARGIN, y, size: 10, font: bold, color: TEAL });
    y -= 15;
    wrap(value, { x: MARGIN, size: 10.5, font: regular, color: DARK, lineGap: 4 });
    y -= 12;
  }
  if (!anyContent) {
    page.drawText("No clinical documentation recorded for this consultation.", { x: MARGIN, y, size: 10, font: regular, color: GRAY });
  }

  // ── Prescription(s) ────────────────────────────────────────────────────────────
  if (data.prescriptions.length > 0) {
    ensure(40);
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: GRAY });
    y -= 20;
    page.drawText("PRESCRIPTION", { x: MARGIN, y, size: 12, font: bold, color: TEAL });
    y -= 17;

    let idx = 1;
    for (const rx of data.prescriptions) {
      for (const med of rx.medications) {
        ensure(28);
        page.drawText(`${idx}. ${med.name}`, { x: MARGIN, y, size: 10.5, font: bold, color: DARK });
        y -= 13;
        page.drawText(`Dosage: ${med.dosage}    Frequency: ${med.frequency}    Duration: ${med.duration}`, {
          x: MARGIN + 14, y, size: 9.5, font: regular, color: DARK,
        });
        y -= 12;
        if (med.notes) wrap(`Note: ${med.notes}`, { x: MARGIN + 14, size: 9, font: regular, color: GRAY });
        y -= 5;
        idx++;
      }
      if (rx.instructions) {
        ensure(24);
        page.drawText("Instructions:", { x: MARGIN, y, size: 9.5, font: bold, color: DARK });
        y -= 13;
        wrap(rx.instructions, { x: MARGIN, size: 9.5, font: regular, color: DARK });
        y -= 8;
      }
    }
  }

  // ── Footer on every page ──────────────────────────────────────────────────────
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: MARGIN, y: 44 }, end: { x: PAGE_W - MARGIN, y: 44 }, thickness: 0.5, color: GRAY });
    p.drawText("Confidential medical record — digitally generated by CareBora.", { x: MARGIN, y: 32, size: 8, font: regular, color: GRAY });
    p.drawText(`Page ${i + 1} of ${pages.length}`, { x: PAGE_W - MARGIN - 60, y: 32, size: 8, font: regular, color: GRAY });
  });

  return doc.save();
}
