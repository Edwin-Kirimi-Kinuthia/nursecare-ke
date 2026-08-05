import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { updateDrugSchema } from "@carebora/shared";
import { drugService } from "@carebora/core";

type Params = { params: Promise<{ drugId: string }> };

/** PATCH /api/v1/admin/drugs/:drugId — update or reactivate a catalogue drug. */
export const PATCH = route(async (req, { params }: Params) => {
  await requireAuth(req, ["admin"]);
  const { drugId } = await params;
  const input = updateDrugSchema.parse(await req.json());
  const drug = await drugService.update(drugId, input);
  return jsonOk(drug);
});

/** DELETE /api/v1/admin/drugs/:drugId — soft-delete (sets isActive = false). */
export const DELETE = route(async (req, { params }: Params) => {
  await requireAuth(req, ["admin"]);
  const { drugId } = await params;
  const drug = await drugService.remove(drugId);
  return jsonOk(drug);
});
