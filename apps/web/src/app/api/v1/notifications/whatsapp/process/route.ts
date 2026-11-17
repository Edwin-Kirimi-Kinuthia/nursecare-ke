import { timingSafeEqual } from "node:crypto";
import { route, jsonOk } from "@/server/http";
import { whatsAppService } from "@carebora/core";
import { ApiError } from "@carebora/shared";

/** GET /api/v1/notifications/whatsapp/process — scheduled retries, protected with CRON_SECRET. */
export const GET = route(async (req) => {
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : "";
  const actual = req.headers.get("authorization") ?? "";
  if (!expected || Buffer.byteLength(expected) !== Buffer.byteLength(actual) || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) throw ApiError.unauthorized();
  return jsonOk(await whatsAppService.processQueue());
});
