import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { ApiError, submitTillSchema } from "@carebora/shared";
import { settlementService } from "@carebora/core";

/**
 * POST /api/v1/payments/till/submit
 * Interim Till mode: the patient reports the M-Pesa confirmation code. Matches
 * the pending Payment by its synthetic gatewayRef (works for any subject —
 * appointment, pharmacy order, or home visit) and moves it to
 * `awaiting_verification` for an admin to confirm against the Till statement.
 */
export const POST = route(async (req) => {
  await requireAuth(req);
  const { gatewayRef, code } = submitTillSchema.parse(await req.json());

  const submitted = await settlementService.submitTill(gatewayRef, code);
  if (!submitted) throw ApiError.notFound("No pending payment matched that reference.");
  return jsonOk({ submitted: true });
});
