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
  prescriptionId: z.string().uuid().optional(),
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
