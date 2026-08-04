import { route, jsonOk } from "@/server/http";
import { requestMeta, setAuthCookies } from "@/server/auth";
import { vendorApplicationSchema } from "@carebora/shared";
import { authService } from "@carebora/core";

/** POST /api/v1/vendors/apply — apply to join as a vendor business (pending admin review). */
export const POST = route(async (req) => {
  const input = vendorApplicationSchema.parse(await req.json());
  const result = await authService.applyAsVendor(input, requestMeta(req));
  return setAuthCookies(jsonOk(result, 201), result);
});
