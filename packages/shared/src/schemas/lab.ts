import { z } from "zod";

export const labOrderStatusEnum = z.enum([
  "requested", "accepted", "sample_collected", "processing", "resulted", "cancelled",
]);
export const labResultFlagEnum = z.enum(["normal", "high", "low", "critical"]);

export const createLabTestSchema = z.object({
  code: z.string().trim().max(30).optional(),
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(100),
  priceKes: z.coerce.number().int().min(1),
  turnaroundHours: z.coerce.number().int().min(1).max(720).optional(),
  sampleType: z.string().trim().max(60).optional(),
});
export type CreateLabTestInput = z.infer<typeof createLabTestSchema>;

export const patchLabTestSchema = createLabTestSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type PatchLabTestInput = z.infer<typeof patchLabTestSchema>;

export const labTestsQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().max(100).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type LabTestsQuery = z.infer<typeof labTestsQuerySchema>;

const kenyanPhone = z
  .string()
  .trim()
  .regex(/^(\+?254|0)[0-9]{9}$/, "Enter a valid Kenyan phone number (e.g. 0712345678)");

export const createLabOrderSchema = z.object({
  orgId: z.string().uuid(),
  testIds: z.array(z.string().uuid()).min(1, "Select at least one test"),
  consultationId: z.string().uuid().optional(),
  collectionType: z.enum(["walk_in", "home_collection"]).default("walk_in"),
  scheduledAt: z.string().datetime().optional(),
  address: z.string().trim().max(500).optional(),
  phoneNumber: kenyanPhone,
});
export type CreateLabOrderInput = z.infer<typeof createLabOrderSchema>;

export const patchLabOrderSchema = z.object({
  status: labOrderStatusEnum.optional(),
});
export type PatchLabOrderInput = z.infer<typeof patchLabOrderSchema>;

export const labOrdersQuerySchema = z.object({
  status: labOrderStatusEnum.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type LabOrdersQuery = z.infer<typeof labOrdersQuerySchema>;

export const enterLabResultSchema = z.object({
  value: z.string().trim().min(1).max(200),
  unit: z.string().trim().max(30).optional(),
  referenceRange: z.string().trim().max(100).optional(),
  flag: labResultFlagEnum.optional(),
  documentFileUrl: z.string().max(9_000_000).optional(),
});
export type EnterLabResultInput = z.infer<typeof enterLabResultSchema>;
