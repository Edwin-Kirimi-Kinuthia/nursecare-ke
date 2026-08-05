import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { patchBranchSchema } from "@carebora/shared";
import { orgService } from "@carebora/core";

/** PATCH /api/v1/vendor/branches/:branchId — owner/manager only. */
export const PATCH = route(async (req, { params }: { params: Promise<{ branchId: string }> }) => {
  const auth = await requireOrgMember(req, { roles: ["owner", "manager"] });
  const { branchId } = await params;
  const input = patchBranchSchema.parse(await req.json());
  const branch = await orgService.patchBranch(auth.orgId, auth.sub, branchId, input);
  return jsonOk(branch);
});
