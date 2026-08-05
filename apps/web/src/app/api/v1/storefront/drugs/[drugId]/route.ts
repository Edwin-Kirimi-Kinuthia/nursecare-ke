import { route, jsonOk } from "@/server/http";
import { drugService } from "@carebora/core";

/** GET /api/v1/storefront/drugs/:drugId — canonical drug detail. No auth required. */
export const GET = route(async (_req, { params }: { params: Promise<{ drugId: string }> }) => {
  const { drugId } = await params;
  const drug = await drugService.getById(drugId);
  return jsonOk(drug);
});
