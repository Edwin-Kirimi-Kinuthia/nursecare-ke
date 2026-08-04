import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { enterLabResultSchema } from "@carebora/shared";
import { labService } from "@carebora/core";

/** POST /api/v1/vendor/lab-orders/items/:itemId/result — enter a result for one test item. */
export const POST = route(async (req, { params }: { params: Promise<{ itemId: string }> }) => {
  const auth = await requireOrgMember(req, { roles: ["owner", "manager", "staff"] });
  const { itemId } = await params;
  const input = enterLabResultSchema.parse(await req.json());
  const result = await labService.enterResult(auth.orgId, itemId, auth.sub, input);
  return jsonOk(result, 201);
});
