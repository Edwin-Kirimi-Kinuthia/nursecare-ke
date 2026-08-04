import { route, jsonOk } from "@/server/http";
import { drugsQuerySchema } from "@carebora/shared";
import { drugService } from "@carebora/core";

/**
 * GET /api/v1/storefront/catalogue — the full canonical drug catalogue (not
 * filtered to drugs with an active listing). Used by vendors picking a drug to
 * claim when adding it to their own catalogue, before any listing exists.
 */
export const GET = route(async (req) => {
  const query = drugsQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const result = await drugService.list(query);
  return jsonOk(result);
});
