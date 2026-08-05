import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { createDrugSchema, drugsQuerySchema } from "@carebora/shared";
import { drugService } from "@carebora/core";

/** GET /api/v1/admin/drugs — the canonical medication catalogue. */
export const GET = route(async (req) => {
  await requireAuth(req, ["admin"]);
  const query = drugsQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const result = await drugService.list(query);
  return jsonOk(result);
});

/** POST /api/v1/admin/drugs — add a drug to the shared catalogue. */
export const POST = route(async (req) => {
  await requireAuth(req, ["admin"]);
  const input = createDrugSchema.parse(await req.json());
  const drug = await drugService.create(input);
  return jsonOk(drug, 201);
});
