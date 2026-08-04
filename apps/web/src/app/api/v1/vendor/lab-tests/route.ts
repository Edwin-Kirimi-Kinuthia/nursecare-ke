import { route, jsonOk } from "@/server/http";
import { requireOrgMember } from "@/server/auth";
import { createLabTestSchema } from "@carebora/shared";
import { labService } from "@carebora/core";

/** GET /api/v1/vendor/lab-tests — this lab's test menu. */
export const GET = route(async (req) => {
  const auth = await requireOrgMember(req);
  const tests = await labService.listTestsForVendor(auth.orgId);
  return jsonOk({ tests });
});

/** POST /api/v1/vendor/lab-tests — add a test to the menu. */
export const POST = route(async (req) => {
  const auth = await requireOrgMember(req, { roles: ["owner", "manager"] });
  const input = createLabTestSchema.parse(await req.json());
  const test = await labService.createTest(auth.orgId, input);
  return jsonOk(test, 201);
});
