import { z } from "zod";
import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { orderService } from "@carebora/core";
export const POST = route(async (req, { params }: { params: Promise<{ vendorOrderId: string }> }) => {
  await requireAuth(req, ["admin"]);
  const id = z.string().uuid().parse((await params).vendorOrderId);
  return jsonOk(await orderService.adminRequestReview(id));
});
