import { z } from "zod";

const kenyanPhone = z
  .string()
  .trim()
  .regex(/^(\+?254|0)[0-9]{9}$/, "Enter a valid Kenyan phone number (e.g. 0712345678)");

export const createHomeVisitSchema = z.object({
  specialty: z.enum(["nurse", "physio", "doctor"]),
  urgency: z.enum(["routine", "urgent", "emergency"]).default("routine"),
  description: z.string().min(10, "Please describe your symptoms or needs").max(1000),
  address: z.string().min(5, "Full address is required").max(500),
  county: z.string().min(2).max(100),
  scheduledAt: z.string().datetime().optional(),
});
export type CreateHomeVisitInput = z.infer<typeof createHomeVisitSchema>;

export const assignHomeVisitSchema = z.object({
  providerId: z.string().uuid("Invalid provider ID"),
  feeKes: z.number().int().positive("Fee must be a positive amount"),
  scheduledAt: z.string().datetime(),
});
export type AssignHomeVisitInput = z.infer<typeof assignHomeVisitSchema>;

export const homeVisitStkSchema = z.object({
  phoneNumber: kenyanPhone,
});
export type HomeVisitStkInput = z.infer<typeof homeVisitStkSchema>;

export const patchHomeVisitSchema = z.object({
  status: z.enum(["en_route", "arrived", "completed", "cancelled"]).optional(),
  visitNotes: z.string().max(2000).optional(),
});
export type PatchHomeVisitInput = z.infer<typeof patchHomeVisitSchema>;

export const homeVisitsQuerySchema = z.object({
  status: z
    .enum(["pending", "assigned", "paid", "en_route", "arrived", "completed", "cancelled"])
    .optional(),
  specialty: z.enum(["nurse", "physio", "doctor"]).optional(),
  urgency: z.enum(["routine", "urgent", "emergency"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type HomeVisitsQuery = z.infer<typeof homeVisitsQuerySchema>;
