import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { documentSignatureService } from "@carebora/core";
import { documentSignatureSchema, PROVIDER_ROLES } from "@carebora/shared";
import { validateSigningImages } from "@/server/clinical-document-pdf";

/** GET /api/v1/providers/me/document-signature — read your own private signing profile. */
export const GET = route(async (req) => {
  const auth = await requireAuth(req, PROVIDER_ROLES);
  return jsonOk(await documentSignatureService.get(auth.sub), 200, { "Cache-Control": "private, no-store" });
});

/** PUT /api/v1/providers/me/document-signature — authorize your signature on your clinical PDFs. */
export const PUT = route(async (req) => {
  const auth = await requireAuth(req, PROVIDER_ROLES);
  const input = documentSignatureSchema.parse(await req.json());
  await validateSigningImages(input.signatureDataUrl);
  return jsonOk(await documentSignatureService.save(auth.sub, auth.role, input));
});
