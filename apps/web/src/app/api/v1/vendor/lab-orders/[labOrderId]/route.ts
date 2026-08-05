import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { patchLabOrderSchema } from "@carebora/shared";
import { labService } from "@carebora/core";

/** PATCH /api/v1/vendor/lab-orders/:labOrderId — accept, mark sample collected/processing, or cancel. */
export const PATCH = route(async (req, { params }: { params: Promise<{ labOrderId: string }> }) => {
  const auth = await requireOrgMember(req, { roles: ["owner", "manager", "staff"], orgType: "lab" });
  const { labOrderId } = await params;
  const input = patchLabOrderSchema.parse(await req.json());
  const order = await labService.patchOrder(auth.orgId, labOrderId, input);
  return jsonOk(order);
});
