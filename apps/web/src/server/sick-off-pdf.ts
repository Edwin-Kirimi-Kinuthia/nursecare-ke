import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { SickOff } from "@carebora/db";
import { ApiError } from "@carebora/shared";

async function signingImage(doc: PDFDocument, value: string) {
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

export async function generateSickOffPdf(c: SickOff) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Sick-off certificate ${c.id}`);
  doc.setAuthor(c.providerName);
  doc.setCreationDate(c.issuedAt);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595, 842]);
  const teal = rgb(0.05, 0.35, 0.29);
  const dark = rgb(0.12, 0.16, 0.14);
  let y = 790;
  const line = (text: string, size = 11, strong = false) => {
    const font = strong ? bold : regular;
    let current = "";
    for (const word of text.split(/\s+/)) {
      if (font.widthOfTextAtSize(`${current} ${word}`, size) > 485 && current) {
        page.drawText(current, { x: 55, y, size, font, color: dark }); y -= size + 6; current = "";
      }
      current = current ? `${current} ${word}` : word;
    }
    page.drawText(current, { x: 55, y, size, font, color: dark }); y -= size + 6;
  };
  const date = (d: Date) => d.toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "long" });
  page.drawText("Care Bora", { x: 55, y, size: 28, font: bold, color: teal }); y -= 32;
  line("TELECONSULTATION SICK-OFF CERTIFICATE", 15, true); y -= 10;
  line(`Certificate reference: ${c.id}`, 9);
  line(`Issued: ${date(c.issuedAt)}`, 10);
  line(`Consultation reference: ${c.consultationId}`, 9); y -= 20;
  line(`Patient: ${c.patientName}`, 13, true); y -= 12;
  line(`The above patient was assessed through a video consultation on ${date(c.assessedAt)}.`); y -= 10;
  const days = Math.round((+c.throughDate - +c.fromDate) / 86_400_000) + 1;
  line(`I recommend ${days} day${days === 1 ? "" : "s"} off work or studies, from ${date(c.fromDate)} to ${date(c.throughDate)}, inclusive.`); y -= 10;
  const returnDate = new Date(+c.throughDate + 86_400_000);
  line(`Expected return date: ${date(returnDate)}, subject to further clinical review if needed.`);
  if (c.advice) { y -= 12; line("Additional advice", 11, true); line(c.advice, 10); }
  if (y < 360) {
    page = doc.addPage([595, 842]); y = 780;
    line(`Certificate reference: ${c.id}`, 10); y -= 20;
  }
  y = Math.min(y - 28, 390);
  line(`Treating provider: ${c.providerName}`, 12, true);
  line(`Licensing body: ${c.licenceBody}`, 11);
  line(`Licence / registration number: ${c.licenceNumber}`, 11);
  const signature = await signingImage(doc, c.signatureDataUrl);
  const scaled = signature.scaleToFit(210, 70);
  page.drawImage(signature, { x: 55, y: y - 78, width: scaled.width, height: scaled.height });
  page.drawText("Provider signature", { x: 55, y: y - 95, size: 9, font: regular, color: dark });
  if (c.stampDataUrl) {
    const stamp = await signingImage(doc, c.stampDataUrl);
    const size = stamp.scaleToFit(180, 95);
    page.drawImage(stamp, { x: 330, y: y - 90, width: size.width, height: size.height });
  }
  page.drawRectangle({ x: 325, y: 95, width: 215, height: 55, borderColor: teal, borderWidth: 1.5 });
  page.drawText("CARE BORA - ISSUED ELECTRONICALLY", { x: 334, y: 131, size: 8, font: bold, color: teal });
  page.drawText(date(c.issuedAt), { x: 334, y: 115, size: 10, font: regular, color: teal });
  page.drawText(`Ref: ${c.id.slice(0, 8).toUpperCase()}`, { x: 334, y: 101, size: 9, font: regular, color: teal });
  page.drawText("Authorized by the treating provider. No diagnosis is disclosed unless entered in the advice.", { x: 55, y: 64, size: 8, font: regular, color: dark });
  return doc.save();
}
