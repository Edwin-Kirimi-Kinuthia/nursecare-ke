import { PROVIDER_ROLES } from "@carebora/shared";
import { requireAuth, requireOrgMember } from "./auth";

export async function earningsAuth(req: Request) {
  const auth = await requireAuth(req, [...PROVIDER_ROLES, "vendor"]);
  if (auth.role === "vendor") {
    const member = await requireOrgMember(req, { roles: ["owner"] });
    return { actorId: auth.sub, payee: { orgId: member.orgId } };
  }
  return { actorId: auth.sub, payee: { providerId: auth.sub } };
}
