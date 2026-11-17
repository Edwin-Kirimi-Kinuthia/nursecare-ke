import { route, jsonOk } from "@/server/http";
import { handleWhatsAppWebhook, validWhatsAppSignature, validWebhookToken } from "@carebora/core";
import { ApiError } from "@carebora/shared";

export const runtime = "nodejs";

/** GET /api/v1/notifications/whatsapp/webhook — Meta's subscription verification. */
export const GET = route((req) => {
  const query = new URL(req.url).searchParams;
  if (query.get("hub.mode") !== "subscribe" || !validWebhookToken(query.get("hub.verify_token"))) throw ApiError.forbidden();
  return new Response(query.get("hub.challenge") ?? "", { headers: { "Content-Type": "text/plain" } });
});

/** POST /api/v1/notifications/whatsapp/webhook — signed Meta delivery receipts and STOP/START. */
export const POST = route(async (req) => {
  const body = await req.text();
  if (!validWhatsAppSignature(body, req.headers.get("x-hub-signature-256"))) throw ApiError.unauthorized();
  if (body.length > 1_000_000) throw ApiError.badRequest("Webhook payload is too large");
  await handleWhatsAppWebhook(JSON.parse(body));
  return jsonOk({ received: true });
});
