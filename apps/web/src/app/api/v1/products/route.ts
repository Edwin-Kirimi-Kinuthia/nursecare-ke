import { route, jsonOk } from "@/server/http";
import { productsQuerySchema } from "@carebora/shared";
import { productService } from "@carebora/core";

/** GET /api/v1/products — browse the pharmacy catalogue. No auth required. */
export const GET = route(async (req) => {
  const { searchParams } = new URL(req.url);
  const query = productsQuerySchema.parse(Object.fromEntries(searchParams));
  const result = await productService.list(query);
  return jsonOk(result);
});
