import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { patchLabTestSchema } from "@carebora/shared";
import { labService } from "@carebora/core";

/** PATCH /api/v1/vendor/lab-tests/:testId — update price/turnaround, or deactivate. */
export const PATCH = route(async (req, { params }: { params: Promise<{ testId: string }> }) => {
  const auth = await requireOrgMember(req, { roles: ["owner", "manager"], orgType: "lab" });
  const { testId } = await params;
  const input = patchLabTestSchema.parse(await req.json());
  const test = await labService.patchTest(auth.orgId, testId, input);
  return jsonOk(test);
});
