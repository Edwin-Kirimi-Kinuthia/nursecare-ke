import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { adminCreateDrugSchema, drugsQuerySchema } from "@carebora/shared";
import { drugService } from "@carebora/core";

/** GET /api/v1/admin/drugs — the catalogue, each row with Care Bora's own price/stock. */
export const GET = route(async (req) => {
  await requireAuth(req, ["admin"]);
  const query = drugsQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const result = await drugService.adminList(query);
  return jsonOk(result);
});

/**
 * POST /api/v1/admin/drugs — add a drug and list it for sale.
 *
 * Creates the catalogue entry and Care Bora's listing of it together. The
 * catalogue entry alone never reaches the storefront, which only shows
 * listings held by an approved pharmacy with stock.
 */
export const POST = route(async (req) => {
  const auth = await requireAuth(req, ["admin"]);
  const input = adminCreateDrugSchema.parse(await req.json());
  const drug = await drugService.adminCreate(auth.sub, input);
  return jsonOk(drug, 201);
});
