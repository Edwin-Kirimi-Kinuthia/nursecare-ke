import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { patchVendorOrderSchema } from "@carebora/shared";
import { orderService } from "@carebora/core";

/** PATCH /api/v1/vendor/orders/:vendorOrderId — advance fulfilment status, or cancel. */
export const PATCH = route(async (req, { params }: { params: Promise<{ vendorOrderId: string }> }) => {
  const auth = await requireOrgMember(req, { roles: ["owner", "manager", "staff"] });
  const { vendorOrderId } = await params;
  const input = patchVendorOrderSchema.parse(await req.json());
  const vendorOrder = await orderService.patchVendorOrder(auth.orgId, vendorOrderId, input);
  return jsonOk(vendorOrder);
});
