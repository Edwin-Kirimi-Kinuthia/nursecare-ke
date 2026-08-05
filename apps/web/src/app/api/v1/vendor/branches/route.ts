import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { createBranchSchema } from "@carebora/shared";
import { orgService } from "@carebora/core";

/** GET /api/v1/vendor/branches — branches of the caller's organization. */
export const GET = route(async (req) => {
  const auth = await requireOrgMember(req);
  const branches = await orgService.listBranches(auth.orgId, auth.sub);
  return jsonOk({ branches });
});

/** POST /api/v1/vendor/branches — owner/manager only. */
export const POST = route(async (req) => {
  const auth = await requireOrgMember(req, { roles: ["owner", "manager"] });
  const input = createBranchSchema.parse(await req.json());
  const branch = await orgService.createBranch(auth.orgId, auth.sub, input);
  return jsonOk(branch, 201);
});
