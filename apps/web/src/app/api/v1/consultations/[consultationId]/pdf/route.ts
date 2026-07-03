import { route } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { consultationService } from "@carebora/core";
import { generateTreatmentSheetPdf } from "@/server/treatment-sheet-pdf";
import type { ClinicalRecord, Medication } from "@carebora/shared";

/**
 * GET /api/v1/consultations/:consultationId/pdf
 * Streams the consultation's clinical record (treatment sheet / cardex /
 * assessment) as a PDF. Participant-scoped (patient or provider).
 */
export const GET = route(async (req, { params }: { params: Promise<{ consultationId: string }> }) => {
  const { consultationId } = await params;
  const auth = await requireAuth(req);
  const c = await consultationService.getWithParticipants(consultationId, auth.sub);

  const pdfBytes = await generateTreatmentSheetPdf({
    consultationId: c.id,
    role: c.appointment.provider?.user.role ?? null,
    record: (c.clinicalRecord as ClinicalRecord | null) ?? {},
    patientName: c.appointment.patient.fullName,
    providerName: c.appointment.provider?.user.fullName ?? "Provider",
    providerSpecialty: c.appointment.provider?.specialty ?? null,
    date: c.appointment.slot?.startsAt ?? c.createdAt,
    prescriptions: c.prescriptions.map((rx) => ({
      medications: (rx.medications as Medication[]) ?? [],
      instructions: rx.instructions,
      issuedAt: rx.issuedAt,
    })),
  });

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="treatment-sheet-${c.id.slice(0, 8)}.pdf"`,
      "Content-Length": pdfBytes.byteLength.toString(),
    },
  });
});
