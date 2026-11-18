import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont } from "pdf-lib";
import { ApiError } from "@carebora/shared";

export interface DocumentSigner {
  providerName: string; licenceBody: string; licenceNumber: string;
  signatureDataUrl: string; stampDataUrl?: string | null;
}

export async function signingImage(doc: PDFDocument, value: string) {
  try {
    const bytes = Buffer.from(value.slice(value.indexOf(",") + 1), "base64");
    if (bytes.length > 500_000) throw new Error("too large");
    const image = value.startsWith("data:image/png;") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    if (image.width > 3000 || image.height > 3000 || image.width < 2 || image.height < 2) throw new Error("invalid dimensions");
    return image;
  } catch {
    throw ApiError.badRequest("Use a valid PNG or JPEG signature/stamp smaller than 500 KB and 3000 pixels per side");
  }
}

export async function validateSigningImages(signature: string, stamp?: string) {
  const doc = await PDFDocument.create();
  await signingImage(doc, signature);
  if (stamp) await signingImage(doc, stamp);
}

export const documentDate = (value: Date) => value.toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "long" });
export const stampDate = (value: Date) => value.toLocaleDateString("en-GB", { timeZone: "Africa/Nairobi", day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
const TEAL = rgb(0, 0.5, 0.47), BLUE = rgb(0.04, 0.13, 0.64), RED = rgb(0.8, 0.05, 0.05);
const INK = rgb(0.09, 0.1, 0.1), GRAY = rgb(0.4, 0.4, 0.4), LEFT = 48, RIGHT = 547;

/** Wrap paragraphs and long words without losing clinical content. */
function lines(text: string, font: PDFFont, size: number, width: number): string[] {
  const output: string[] = [];
  for (const paragraph of text.replace(/\r/g, "").split("\n")) {
    let line = "";
    for (const character of paragraph) {
      if (line && font.widthOfTextAtSize(line + character, size) > width) {
        const split = line.lastIndexOf(" ");
        if (split > 0) { output.push(line.slice(0, split)); line = line.slice(split + 1); }
        else { output.push(line); line = ""; }
      }
      line += character;
    }
    output.push(line.trimEnd());
  }
  return output;
}

let logoBytes: Promise<Buffer> | undefined;
function logo() {
  return logoBytes ??= readFile(path.join(process.cwd(), "public/logo-mark.png"))
    .catch(() => readFile(path.join(process.cwd(), "apps/web/public/logo-mark.png")));
}

/** Shared letterhead and provider signature; documents can leave space for a physical stamp. */
export async function clinicalDocumentPdf(opts: {
  title: string; reference: string; issuedAt: Date; metadata: [string, string][];
  signer: DocumentSigner; generatedAt?: Date; includeStamp?: boolean;
}) {
  const doc = await PDFDocument.create();
  const generatedAt = opts.generatedAt ?? new Date();
  doc.setTitle(`${opts.title} ${opts.reference}`); doc.setAuthor(opts.signer.providerName);
  doc.setCreationDate(opts.issuedAt); doc.setModificationDate(generatedAt);
  const regular = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const brand = await doc.embedPng(await logo());
  const signature = await signingImage(doc, opts.signer.signatureDataUrl);
  const includeStamp = opts.includeStamp !== false;
  const practiceStamp = includeStamp && opts.signer.stampDataUrl ? await signingImage(doc, opts.signer.stampDataUrl) : null;
  let page = doc.addPage([595, 842]), y = 0;
  const header = () => {
    const mark = brand.scaleToFit(82, 90);
    page.drawImage(brand, { x: LEFT, y: 745, width: mark.width, height: mark.height });
    page.drawText("CareBora", { x: 148, y: 798, size: 29, font: bold, color: TEAL });
    ["Mbagathi Road, Upperhill Nairobi", "admin@carebora.co.ke", "+254 791 390915"].forEach((v, i) => {
      page.drawText(v, { x: 148, y: 777 - 16 * i, size: 9.5, font: bold, color: INK });
    });
    const size = opts.title.length > 35 ? 14 : 17;
    page.drawText(opts.title, { x: (595 - bold.widthOfTextAtSize(opts.title, size)) / 2, y: 715, size, font: bold, color: INK });
    page.drawLine({ start: { x: 0, y: 704 }, end: { x: 595, y: 704 }, color: TEAL, thickness: 1 });
    y = 682;
    for (const [key, value] of opts.metadata) {
      page.drawText(`${key}:`, { x: LEFT, y, size: 10, font: bold, color: INK });
      for (const part of lines(value, regular, 10, RIGHT - 184)) {
        page.drawText(part, { x: 184, y, size: 10, font: regular, color: INK }); y -= 15;
      }
    }
    y -= 8; page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, color: GRAY, thickness: 0.5 }); y -= 26;
  };
  header();
  const ensure = (height: number) => { if (y - height < 285) { page = doc.addPage([595, 842]); header(); } };
  const text = (value: string, options: { bold?: boolean; size?: number; indent?: number; teal?: boolean } = {}) => {
    const size = options.size ?? 11, font = options.bold ? bold : regular, indent = options.indent ?? 0;
    for (const part of lines(value, font, size, RIGHT - LEFT - indent)) {
      ensure(size + 6); page.drawText(part, { x: LEFT + indent, y, size, font, color: options.teal ? TEAL : INK }); y -= size + 6;
    }
  };
  const gap = (height = 14) => { ensure(height); y -= height; };
  const section = (title: string) => {
    ensure(65); gap(10); page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, color: GRAY, thickness: 0.4 }); y -= 18;
    text(title, { bold: true, teal: true, size: 12 });
  };
  const finish = async () => {
    const pages = doc.getPages();
    for (const [index, p] of pages.entries()) {
      let nameY = 249;
      for (const line of lines(opts.signer.providerName, bold, 11, 310)) {
        p.drawText(line, { x: LEFT, y: nameY, size: 11, font: bold, color: INK }); nameY -= 14;
      }
      for (const line of lines(`${opts.signer.licenceBody} No. ${opts.signer.licenceNumber}`, bold, 10, 310)) {
        p.drawText(line, { x: LEFT, y: nameY, size: 10, font: bold, color: INK }); nameY -= 13;
      }
      const sig = signature.scaleToFit(175, Math.max(30, Math.min(85, nameY - 120)));
      p.drawImage(signature, { x: LEFT, y: 112, width: sig.width, height: sig.height });
      p.drawText("Provider signature", { x: LEFT, y: 98, size: 8, font: regular, color: GRAY });
      if (practiceStamp) {
        const s = practiceStamp.scaleToFit(115, 75); p.drawImage(practiceStamp, { x: 235, y: 118, width: s.width, height: s.height });
      }
      if (includeStamp) {
        const cx = 458, cy = 158;
        p.drawCircle({ x: cx, y: cy, size: 76, borderColor: BLUE, borderWidth: 2 });
        p.drawCircle({ x: cx, y: cy, size: 70, borderColor: BLUE, borderWidth: 1 });
        const arc = (label: string, radius: number, start: number, end: number, size: number, bottom = false) => {
          [...label].forEach((character, i) => {
            const theta = (start + (end - start) * i / Math.max(label.length - 1, 1)) * Math.PI / 180;
            const rotation = theta * 180 / Math.PI + (bottom ? 90 : -90), w = bold.widthOfTextAtSize(character, size);
            p.drawText(character, { x: cx + radius * Math.cos(theta) - w / 2 * Math.cos(rotation * Math.PI / 180), y: cy + radius * Math.sin(theta) - w / 2 * Math.sin(rotation * Math.PI / 180), size, font: bold, color: BLUE, rotate: degrees(rotation) });
          });
        };
        arc("CARE BORA", 57, 145, 35, 14);
        arc("UPPERHILL - MBAGATHI ROAD - NAIROBI", 64, 204, 336, 6.8, true);
        const mark = brand.scaleToFit(48, 49);
        p.drawImage(brand, { x: cx - mark.width / 2, y: cy - 13, width: mark.width, height: mark.height });
        const today = stampDate(generatedAt);
        p.drawText(today, { x: cx - bold.widthOfTextAtSize(today, 11.5) / 2, y: cy - 34, size: 11.5, font: bold, color: RED });
      }
      p.drawLine({ start: { x: LEFT, y: 52 }, end: { x: RIGHT, y: 52 }, color: GRAY, thickness: 0.5 });
      p.drawText("Digitally issued by CareBora. Reference: " + opts.reference, { x: LEFT, y: 39, size: 8, font: regular, color: GRAY });
      p.drawText(`Page ${index + 1} of ${pages.length}`, { x: 493, y: 26, size: 8, font: regular, color: GRAY });
    }
    return doc.save();
  };
  return { text, gap, section, finish };
}
