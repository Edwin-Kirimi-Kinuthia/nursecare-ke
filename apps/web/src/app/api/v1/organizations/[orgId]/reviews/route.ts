import { z } from "zod";
import { route, jsonOk } from "@/server/http";
import { serviceReviewService } from "@carebora/core";
export const GET = route(async (_req, { params }: { params: Promise<{ orgId: string }> }) => {
  return jsonOk(await serviceReviewService.listOrganization(z.string().uuid().parse((await params).orgId)));
});
