import { z } from "zod";
import { KENYA_COUNTIES } from "../geo";

const kenyanPhone = z
  .string()
  .trim()
  .regex(/^(\+?254|0)[0-9]{9}$/, "Enter a valid Kenyan phone number (e.g. 0712345678)");

const imageSchema = z
  .string()
  .trim()
  .max(3_000_000)
  .refine((v) => /^(https?:\/\/|\/|data:image\/)/.test(v), "Provide an image URL, path, or upload");

// ── Drugs (canonical catalogue) ─────────────────────────────────────────────

export const drugsQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().max(100).optional(),
  requiresPrescription: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type DrugsQuery = z.infer<typeof drugsQuerySchema>;

export const createDrugSchema = z.object({
  name: z.string().min(2).max(200),
  genericName: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().min(2).max(100),
  form: z.string().max(60).optional(),
  strength: z.string().max(60).optional(),
  imageUrl: imageSchema.optional(),
  images: z.array(imageSchema).max(6, "Up to 6 images").optional(),
  requiresPrescription: z.boolean().default(false),
});
export type CreateDrugInput = z.infer<typeof createDrugSchema>;

/**
 * What the admin catalogue form sends.
 *
 * A Drug is the shared catalogue entry and deliberately carries no price — a
 * price belongs to a Listing, which is one pharmacy's offer of that drug. But
 * the storefront only ever shows Listings, so a drug added to the catalogue
 * alone is invisible to clients no matter how complete it looks in the admin
 * panel. Taking price and stock here lets the admin do both in one step: the
 * catalogue entry, and Care Bora's own listing of it.
 *
 * Stock is what makes it visible — the storefront requires stock_qty > 0 — so
 * it is required rather than defaulted to zero.
 */
export const adminCreateDrugSchema = createDrugSchema.extend({
  priceKes: z.number().int().min(1, "Set a price"),
  stockQty: z.number().int().min(0),
});
export type AdminCreateDrugInput = z.infer<typeof adminCreateDrugSchema>;

export const adminUpdateDrugSchema = createDrugSchema.partial().extend({
  isActive: z.boolean().optional(),
  priceKes: z.number().int().min(1).optional(),
  stockQty: z.number().int().min(0).optional(),
});
export type AdminUpdateDrugInput = z.infer<typeof adminUpdateDrugSchema>;

export const updateDrugSchema = createDrugSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateDrugInput = z.infer<typeof updateDrugSchema>;

// ── Listings (a vendor org's offer of a Drug) ───────────────────────────────

export const createListingSchema = z.object({
  drugId: z.string().uuid().optional(),
  /** Provide instead of drugId to add a brand-new drug to the shared catalogue and claim it in one step. */
  drug: createDrugSchema.optional(),
  priceKes: z.number().int().min(1),
  stockQty: z.number().int().min(0).default(0),
}).refine((d) => d.drugId || d.drug, { message: "Provide either drugId or drug" });
export type CreateListingInput = z.infer<typeof createListingSchema>;

export const patchListingSchema = z.object({
  priceKes: z.number().int().min(1).optional(),
  stockQty: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });
export type PatchListingInput = z.infer<typeof patchListingSchema>;

// ── Storefront (public, proximity-ranked) ───────────────────────────────────

export const storefrontQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().max(100).optional(),
  requiresPrescription: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  county: z.enum(KENYA_COUNTIES).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type StorefrontQuery = z.infer<typeof storefrontQuerySchema>;

export const offersQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});
export type OffersQuery = z.infer<typeof offersQuerySchema>;

// ── Orders (cart may span multiple vendors) ─────────────────────────────────

export const orderItemInputSchema = z.object({
  listingId: z.string().uuid("Invalid listing ID"),
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

/** Patches one vendor's slice of an order (fulfilment status). */
export const patchVendorOrderSchema = z.object({
  status: z.enum(["processing", "dispatched", "delivered", "cancelled"]).optional(),
});
export type PatchVendorOrderInput = z.infer<typeof patchVendorOrderSchema>;

export const ordersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type OrdersQuery = z.infer<typeof ordersQuerySchema>;

export const vendorOrdersQuerySchema = z.object({
  status: z
    .enum(["pending", "awaiting_verification", "paid", "processing", "dispatched", "delivered", "cancelled", "refunded"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type VendorOrdersQuery = z.infer<typeof vendorOrdersQuerySchema>;
