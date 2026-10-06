import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { launchResetSchema } from "@carebora/shared";
import { adminService } from "@carebora/core";

/** GET /api/v1/admin/maintenance/launch-reset — preview counts before running it. */
export const GET = route(async (req) => {
  await requireAuth(req, ["admin"]);
  const preview = await adminService.previewLaunchReset();
  return jsonOk(preview);
});

/** POST /api/v1/admin/maintenance/launch-reset — wipe every non-admin user/org. Irreversible. */
export const POST = route(async (req) => {
  const auth = await requireAuth(req, ["admin"]);
  launchResetSchema.parse(await req.json());
  const result = await adminService.performLaunchReset(auth.sub);
  return jsonOk(result);
});
