import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { labService } from "@carebora/core";

/** GET /api/v1/lab-orders/:labOrderId — the patient's own view, or a provider/org with access. */
export const GET = route(async (req, { params }: { params: Promise<{ labOrderId: string }> }) => {
  const claims = await requireAuth(req);
  const { labOrderId } = await params;
  const order = await labService.getById(labOrderId, claims);
  return jsonOk(order);
});
