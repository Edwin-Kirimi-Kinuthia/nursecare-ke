import { z } from "zod";
import { KENYA_COUNTIES } from "../geo";

const kenyanPhone = z
  .string()
  .trim()
  .regex(/^(\+?254|0)[0-9]{9}$/, "Enter a valid Kenyan phone number (e.g. 0712345678)");

export const ambulanceTypeEnum = z.enum(["basic", "advanced_life_support", "icu", "neonatal", "mortuary"]);
export const urgencyEnum = z.enum(["routine", "urgent", "emergency"]);
export const ambulanceRequestStatusEnum = z.enum([
  "requested", "accepted", "dispatched", "en_route_pickup", "arrived_pickup",
  "en_route_destination", "completed", "cancelled",
]);

export const createAmbulanceRequestSchema = z.object({
  type: ambulanceTypeEnum.default("basic"),
  urgency: urgencyEnum.default("urgent"),
  pickupAddress: z.string().trim().min(5).max(500),
  pickupCounty: z.enum(KENYA_COUNTIES),
  pickupLatitude: z.coerce.number().min(-90).max(90),
  pickupLongitude: z.coerce.number().min(-180).max(180),
  destinationName: z.string().trim().max(200).optional(),
  destinationAddress: z.string().trim().max(500).optional(),
  patientCondition: z.string().trim().min(3).max(1000),
  contactPhone: kenyanPhone,
});
export type CreateAmbulanceRequestInput = z.infer<typeof createAmbulanceRequestSchema>;

export const acceptAmbulanceRequestSchema = z.object({
  ambulanceId: z.string().uuid().optional(),
  estimatedKes: z.coerce.number().int().min(0).optional(),
});
export type AcceptAmbulanceRequestInput = z.infer<typeof acceptAmbulanceRequestSchema>;

export const patchAmbulanceRequestSchema = z.object({
  status: ambulanceRequestStatusEnum.optional(),
  feeKes: z.coerce.number().int().min(0).optional(),
  cancelReason: z.string().trim().max(500).optional(),
  note: z.string().trim().max(500).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });
export type PatchAmbulanceRequestInput = z.infer<typeof patchAmbulanceRequestSchema>;

export const ambulanceRequestsQuerySchema = z.object({
  status: ambulanceRequestStatusEnum.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type AmbulanceRequestsQuery = z.infer<typeof ambulanceRequestsQuerySchema>;

export const vendorAmbulanceQueueQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type VendorAmbulanceQueueQuery = z.infer<typeof vendorAmbulanceQueueQuerySchema>;

// ── Fleet management ─────────────────────────────────────────────────────────

export const createAmbulanceSchema = z.object({
  branchId: z.string().uuid().optional(),
  plateNumber: z.string().trim().min(4).max(20),
  type: ambulanceTypeEnum,
  crewSize: z.coerce.number().int().min(1).max(10).default(2),
  equipment: z.array(z.string().trim().max(60)).max(20).optional(),
});
export type CreateAmbulanceInput = z.infer<typeof createAmbulanceSchema>;

export const patchAmbulanceSchema = z.object({
  branchId: z.string().uuid().nullable().optional(),
  type: ambulanceTypeEnum.optional(),
  crewSize: z.coerce.number().int().min(1).max(10).optional(),
  equipment: z.array(z.string().trim().max(60)).max(20).optional(),
  isActive: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });
export type PatchAmbulanceInput = z.infer<typeof patchAmbulanceSchema>;
