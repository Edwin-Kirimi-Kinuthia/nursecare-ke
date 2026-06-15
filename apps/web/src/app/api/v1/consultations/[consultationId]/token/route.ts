import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { consultationService } from "@carebora/core";

/**
 * POST /api/v1/consultations/:consultationId/token
 * Returns a LiveKit join token for the authenticated participant.
 * Body: { displayName?: string }  (falls back to the user's fullName from the DB)
 */
export const POST = route(async (req, { params }: { params: Promise<{ consultationId: string }> }) => {
  const { consultationId } = await params;
  const auth = await requireAuth(req);

  let displayName: string = auth.sub;
  try {
    const body = await req.json();
    if (body?.displayName) displayName = String(body.displayName);
  } catch {
    // empty body is fine — displayName stays as userId
  }

  const result = await consultationService.generateToken(consultationId, auth.sub, displayName);
  return jsonOk(result);
});
