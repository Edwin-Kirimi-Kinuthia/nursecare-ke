import { z } from "zod";

// ── Provider directory ────────────────────────────────────────────────────────

export const providersQuerySchema = z.object({
  specialty: z.string().optional(),
  county: z.string().optional(),
  verified: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  available: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  type: z.enum(["teleconsult", "home_visit"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ProvidersQuery = z.infer<typeof providersQuerySchema>;

// ── Availability (provider schedule) ─────────────────────────────────────────

export const createAvailabilitySchema = z.object({
  appointmentType: z.enum(["teleconsult", "home_visit"]),
  dayOfWeek: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
  slotDuration: z.number().int().min(15).max(120).default(30),
});

export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;

// ── Slots ─────────────────────────────────────────────────────────────────────

export const slotsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  type: z.enum(["teleconsult", "home_visit"]).optional(),
});

export type SlotsQuery = z.infer<typeof slotsQuerySchema>;

export const createSlotSchema = z.object({
  appointmentType: z.enum(["teleconsult", "home_visit"]),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

export type CreateSlotInput = z.infer<typeof createSlotSchema>;

// ── Appointments ──────────────────────────────────────────────────────────────

export const createAppointmentSchema = z.object({
  slotId: z.string().uuid("Invalid slot ID"),
  patientNotes: z.string().max(1000).optional(),
  /**
   * How the clinician reaches the patient. Optional here because teleconsults
   * don't need it — the service requires it for home ("door to door") visits,
   * where it's only knowable once the slot's type is loaded.
   */
  contactPhone: z
    .string()
    .trim()
    .regex(/^(\+?254|0)[0-9]{9}$/, "Enter a valid Kenyan phone number (e.g. 0712345678)")
    .optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const patchAppointmentSchema = z.object({
  status: z.enum(["confirmed", "completed", "cancelled", "no_show"]).optional(),
  notes: z.string().max(5000).optional(),
});

export type PatchAppointmentInput = z.infer<typeof patchAppointmentSchema>;

export const appointmentsQuerySchema = z.object({
  status: z
    .enum(["requested", "confirmed", "completed", "cancelled", "no_show"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type AppointmentsQuery = z.infer<typeof appointmentsQuerySchema>;
