import { route, jsonOk } from "@/server/http";
import { z } from "zod";
import { KENYA_COUNTIES } from "@carebora/shared";
import { labService } from "@carebora/core";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  county: z.enum(KENYA_COUNTIES).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** GET /api/v1/storefront/labs — nearby diagnostic labs, ranked by distance. No auth required. */
export const GET = route(async (req) => {
  const query = querySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const labs = await labService.nearbyLabs(query);
  return jsonOk({ labs });
});
