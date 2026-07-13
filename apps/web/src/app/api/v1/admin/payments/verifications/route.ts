import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { verifyTillSchema } from "@carebora/shared";
import { adminService } from "@carebora/core";

/** GET /api/v1/admin/payments/verifications — Till payments awaiting verification. */
export const GET = route(async (req) => {
  await requireAuth(req, ["admin"]);
  const result = await adminService.listTillVerifications();
  return jsonOk(result);
});

/** POST /api/v1/admin/payments/verifications — approve or reject a Till payment. */
export const POST = route(async (req) => {
  const claims = await requireAuth(req, ["admin"]);
  const { context, id, approve } = verifyTillSchema.parse(await req.json());
  const result = await adminService.verifyTillPayment(context, id, approve, claims.sub);
  return jsonOk(result);
});
