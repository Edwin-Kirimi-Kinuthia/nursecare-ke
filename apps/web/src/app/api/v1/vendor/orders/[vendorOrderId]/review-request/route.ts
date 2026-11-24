import { z } from "zod";
import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { orderService } from "@carebora/core";
export const POST = route(async (req, { params }: { params: Promise<{ vendorOrderId: string }> }) => {
  const auth = await requireOrgMember(req, { roles: ["owner", "manager", "staff"], orgType: "pharmacy" });
  const id = z.string().uuid().parse((await params).vendorOrderId);
  return jsonOk(await orderService.requestReview(auth.orgId, id));
});
