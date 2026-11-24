import { z } from "zod";
import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { patchVendorOrderSchema } from "@carebora/shared";
import { orderService } from "@carebora/core";

/** PATCH /api/v1/admin/orders/:vendorOrderId — fulfil any pharmacy's order. */
export const PATCH = route(async (req, { params }: { params: Promise<{ vendorOrderId: string }> }) => {
  const auth = await requireAuth(req, ["admin"]);
  const id = z.string().uuid().parse((await params).vendorOrderId);
  return jsonOk(await orderService.adminPatchVendorOrder(id, patchVendorOrderSchema.parse(await req.json()), auth.sub));
});
