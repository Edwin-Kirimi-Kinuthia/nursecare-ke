import { route } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { sickOffService } from "@carebora/core";
import { generateSickOffPdf } from "@/server/sick-off-pdf";

/** GET /api/v1/consultations/:consultationId/sick-offs/:certificateId/pdf — download an issued signed certificate (participants only). */
export const GET = route(async (req, { params }: { params: Promise<{ consultationId: string; certificateId: string }> }) => {
  const auth = await requireAuth(req);
  const { consultationId, certificateId } = await params;
  const c = await sickOffService.get(consultationId, certificateId, auth.sub);
  const bytes = await generateSickOffPdf(c);
  return new Response(Buffer.from(bytes), { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="sick-off-${c.id.slice(0, 8)}.pdf"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  } });
});
