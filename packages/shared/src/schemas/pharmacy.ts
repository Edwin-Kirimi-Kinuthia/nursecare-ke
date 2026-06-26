import { z } from "zod";

const kenyanPhone = z
  .string()
  .trim()
  .regex(/^(\+?254|0)[0-9]{9}$/, "Enter a valid Kenyan phone number (e.g. 0712345678)");

// ── Products ──────────────────────────────────────────────────────────────────

export const productsQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().max(100).optional(),
  requiresPrescription: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  inStock: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ProductsQuery = z.infer<typeof productsQuerySchema>;

// ── Orders ────────────────────────────────────────────────────────────────────

export const orderItemInputSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  qty: z.number().int().min(1).max(100),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, "At least one item is required"),
  phoneNumber: kenyanPhone,
  deliveryAddress: z.string().min(5, "Delivery address is required").max(500),
  deliveryNotes: z.string().max(500).optional(),
  // For prescription-only items, the patient supplies EITHER an existing
  // prescription (issued in a consultation) OR an uploaded prescription image
  // (data URL). Capped for the demo; production swaps this for a Blob upload URL.
  prescriptionId: z.string().uuid().optional(),
  prescriptionImage: z.string().max(5_000_000).optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const patchOrderSchema = z.object({
  status: z.enum(["processing", "dispatched", "delivered", "cancelled"]).optional(),
});
export type PatchOrderInput = z.infer<typeof patchOrderSchema>;

export const ordersQuerySchema = z.object({
  status: z
    .enum(["pending", "paid", "processing", "dispatched", "delivered", "cancelled", "refunded"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type OrdersQuery = z.infer<typeof ordersQuerySchema>;

// ── Admin product management ──────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  genericName: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().min(2).max(100),
  imageUrl: z.string().url().optional(),
  priceKes: z.number().int().min(1),
  requiresPrescription: z.boolean().default(false),
  stockQty: z.number().int().min(0).default(0),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
