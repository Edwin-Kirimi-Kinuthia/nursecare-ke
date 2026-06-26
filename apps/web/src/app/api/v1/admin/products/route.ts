import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { createProductSchema, productsQuerySchema } from "@carebora/shared";
import { productService } from "@carebora/core";

/** GET /api/v1/admin/products — full catalogue including inactive products. */
export const GET = route(async (req) => {
  await requireAuth(req, ["admin", "pharmacy"]);
  const { searchParams } = new URL(req.url);
  const query = productsQuerySchema.parse(Object.fromEntries(searchParams));
  const result = await productService.list({ ...query });
  return jsonOk(result);
});

/** POST /api/v1/admin/products — add a product to the catalogue. */
export const POST = route(async (req) => {
  await requireAuth(req, ["admin", "pharmacy"]);
  const body = await req.json();
  const input = createProductSchema.parse(body);
  const product = await productService.create(input);
  return jsonOk(product, 201);
});
