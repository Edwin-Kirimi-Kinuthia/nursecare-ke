import { route } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { prescriptionService, documentSignatureService } from "@carebora/core";
import { generatePrescriptionPdf } from "@/server/prescription-pdf";
import { ApiError, type Medication } from "@carebora/shared";

/**
 * GET /api/v1/consultations/:consultationId/prescriptions/:prescriptionId/pdf
 * Generates and streams the prescription as a PDF.
 */
export const GET = route(async (req, {
  params,
}: {
  params: Promise<{ consultationId: string; prescriptionId: string }>;
}) => {
  const { prescriptionId, consultationId } = await params;
  const auth = await requireAuth(req);
  const rx = await prescriptionService.getById(prescriptionId, auth.sub, auth.role);
  if (rx.consultationId !== consultationId) throw ApiError.notFound("Prescription not found in this consultation");
  const signer = await documentSignatureService.forDocument(rx.providerId);

  const pdfBytes = await generatePrescriptionPdf({
    prescriptionId: rx.id,
    issuedAt: rx.issuedAt,
    expiresAt: rx.expiresAt,
    patientName: rx.patient.fullName,
    providerName: rx.provider.fullName,
    medications: rx.medications as Medication[],
    instructions: rx.instructions,
    signer,
  });

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="prescription-${rx.id.slice(0, 8)}.pdf"`,
      "Content-Length": pdfBytes.byteLength.toString(),
      "Cache-Control": "private, no-store",
    },
  });
});
