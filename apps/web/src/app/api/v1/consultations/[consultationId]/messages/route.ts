import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { sendMessageSchema } from "@carebora/shared";
import { consultationService } from "@carebora/core";

/** GET /api/v1/consultations/:consultationId/messages — list persisted chat messages. */
export const GET = route(async (req, { params }: { params: Promise<{ consultationId: string }> }) => {
  const { consultationId } = await params;
  const auth = await requireAuth(req);
  const messages = await consultationService.listMessages(consultationId, auth.sub);
  return jsonOk(messages);
});

/** POST /api/v1/consultations/:consultationId/messages — send a chat message. */
export const POST = route(async (req, { params }: { params: Promise<{ consultationId: string }> }) => {
  const { consultationId } = await params;
  const auth = await requireAuth(req);
  const input = sendMessageSchema.parse(await req.json());
  const message = await consultationService.sendMessage(consultationId, auth.sub, input);
  return jsonOk(message, 201);
});
