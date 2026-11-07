import { route, jsonOk } from "@/server/http";
import { requireAuth, clearAuthCookies } from "@/server/auth";
import { deleteAccountSchema } from "@carebora/shared";
import { authService } from "@carebora/core";
import { revalidateProviderPages } from "@/server/revalidate-provider-pages";

/**
 * POST /api/v1/auth/delete-account — permanently delete your own account.
 *
 * Required by the Apple App Store and Google Play. Personal data is removed and
 * the record is anonymised; clinical and payment records that must be retained
 * stay, without your name. Upcoming appointments are cancelled. Irreversible.
 *
 * A POST rather than DELETE /auth/me because some proxies and mobile HTTP
 * stacks drop the body of a DELETE, and the password is in the body.
 */
export const POST = route(async (req) => {
  const auth = await requireAuth(req);
  const input = deleteAccountSchema.parse(await req.json());
  const result = await authService.deleteAccount(auth.sub, input);
  revalidateProviderPages(auth.sub);
  return clearAuthCookies(jsonOk(result));
});
