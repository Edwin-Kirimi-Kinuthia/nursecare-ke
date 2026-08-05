import { route, jsonOk } from "@/server/http";
import { labTestsQuerySchema } from "@carebora/shared";
import { labService } from "@carebora/core";

/** GET /api/v1/storefront/labs/:orgId/tests — a lab's test menu. No auth required. */
export const GET = route(async (req, { params }: { params: Promise<{ orgId: string }> }) => {
  const { orgId } = await params;
  const query = labTestsQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const tests = await labService.testsForOrg(orgId, query);
  return jsonOk({ tests });
});
