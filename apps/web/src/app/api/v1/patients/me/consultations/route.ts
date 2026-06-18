import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { consultationService } from "@carebora/core";

/** GET /api/v1/patients/me/consultations — the caller's medical history. */
export const GET = route(async (req) => {
  const claims = await requireAuth(req);
  const history = await consultationService.listForPatient(claims.sub);
  return jsonOk({ consultations: history });
});
