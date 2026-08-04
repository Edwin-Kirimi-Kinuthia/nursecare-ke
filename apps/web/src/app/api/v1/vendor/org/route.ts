import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { patchOrgSchema } from "@carebora/shared";
import { orgService } from "@carebora/core";

/** GET /api/v1/vendor/org — the caller's organization (branches + members included). */
export const GET = route(async (req) => {
  const auth = await requireOrgMember(req);
  const org = await orgService.getById(auth.orgId, auth.sub);
  return jsonOk(org);
});

/** PATCH /api/v1/vendor/org — owner/manager only. */
export const PATCH = route(async (req) => {
  const auth = await requireOrgMember(req, { roles: ["owner", "manager"] });
  const input = patchOrgSchema.parse(await req.json());
  const org = await orgService.patch(auth.orgId, auth.sub, input);
  return jsonOk(org);
});
