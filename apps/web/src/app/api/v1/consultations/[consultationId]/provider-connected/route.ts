import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { consultationService } from "@carebora/core";

/** POST /api/v1/consultations/:consultationId/provider-connected — verify the provider's media connection and notify the client once. */
export const POST = route(async (req, { params }: { params: Promise<{ consultationId: string }> }) => {
  const auth = await requireAuth(req, ["doctor", "nurse", "physio", "pharmacy"]);
  const { consultationId } = await params;
  return jsonOk(await consultationService.providerConnected(consultationId, auth.sub));
});
