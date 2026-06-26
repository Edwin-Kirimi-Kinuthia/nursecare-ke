import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { updateProductSchema } from "@carebora/shared";
import { productService } from "@carebora/core";

type Params = { params: Promise<{ productId: string }> };

/** PATCH /api/v1/admin/products/:productId — update price, stock, details, or deactivate. */
export const PATCH = route(async (req, { params }: Params) => {
  await requireAuth(req, ["admin", "pharmacy"]);
  const { productId } = await params;
  const body = await req.json();
  const input = updateProductSchema.parse(body);
  const product = await productService.update(productId, input);
  return jsonOk(product);
});

/** DELETE /api/v1/admin/products/:productId — soft-delete (sets isActive = false). */
export const DELETE = route(async (req, { params }: Params) => {
  await requireAuth(req, ["admin"]);
  const { productId } = await params;
  const product = await productService.remove(productId);
  return jsonOk(product);
});
