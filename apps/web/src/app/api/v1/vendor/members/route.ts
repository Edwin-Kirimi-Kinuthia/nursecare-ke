import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { inviteMemberSchema } from "@carebora/shared";
import { orgService } from "@carebora/core";

/** GET /api/v1/vendor/members — staff roster of the caller's organization. */
export const GET = route(async (req) => {
  const auth = await requireOrgMember(req);
  const members = await orgService.listMembers(auth.orgId, auth.sub);
  return jsonOk({ members });
});

/** POST /api/v1/vendor/members — invite an existing CareBora user to the org. */
export const POST = route(async (req) => {
  const auth = await requireOrgMember(req, { roles: ["owner", "manager"] });
  const input = inviteMemberSchema.parse(await req.json());
  const member = await orgService.inviteMember(auth.orgId, auth.sub, input);
  return jsonOk(member, 201);
});
