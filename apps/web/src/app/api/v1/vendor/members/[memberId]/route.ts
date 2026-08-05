import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { orgService } from "@carebora/core";

/** DELETE /api/v1/vendor/members/:memberId — deactivate a staff member (owner/manager only). */
export const DELETE = route(async (req, { params }: { params: Promise<{ memberId: string }> }) => {
  const auth = await requireOrgMember(req, { roles: ["owner", "manager"] });
  const { memberId } = await params;
  const member = await orgService.removeMember(auth.orgId, auth.sub, memberId);
  return jsonOk(member);
});
