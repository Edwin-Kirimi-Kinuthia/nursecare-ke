import { route, jsonOk } from "@/server/http";
import { productService } from "@carebora/core";

/** GET /api/v1/products/:productId — fetch a single product. No auth required. */
export const GET = route(async (_req, { params }: { params: Promise<{ productId: string }> }) => {
  const { productId } = await params;
  const product = await productService.getById(productId);
  return jsonOk(product);
});
