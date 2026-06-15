import { route, jsonOk } from "@/server/http";
import { providersQuerySchema } from "@carebora/shared";
import { providerService } from "@carebora/core";

/** GET /api/v1/providers — browse verified providers with optional filters. */
export const GET = route(async (req) => {
  const { searchParams } = new URL(req.url);
  const query = providersQuerySchema.parse(Object.fromEntries(searchParams));
  const result = await providerService.list(query);
  return jsonOk(result);
});
