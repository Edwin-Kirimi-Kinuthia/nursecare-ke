import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { drugService } from "@carebora/core";

/**
 * POST /api/v1/admin/drugs/import-otc — put the starter OTC range on sale in
 * Care Bora Pharmacy with placeholder prices/stock for the owner to edit.
 * Idempotent.
 */
export const POST = route(async (req) => {
  const auth = await requireAuth(req, ["admin"]);
  return jsonOk(await drugService.importStarterOtc(auth.sub));
});
export const maxDuration = 120;
