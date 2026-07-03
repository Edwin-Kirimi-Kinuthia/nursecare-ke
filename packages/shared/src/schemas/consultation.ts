import { z } from "zod";

// ── Consultation ──────────────────────────────────────────────────────────────

export const patchConsultationSchema = z.object({
  status: z.enum(["active", "ended"]).optional(),
  clinicalNotes: z.string().max(10000).optional(),
  /** Structured role-specific record: section key → text. */
  clinicalRecord: z.record(z.string().max(8000)).optional(),
});

export type PatchConsultationInput = z.infer<typeof patchConsultationSchema>;

// ── Messages ──────────────────────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(2000),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ── Prescriptions ─────────────────────────────────────────────────────────────

export const medicationSchema = z.object({
  name: z.string().min(1).max(200),
  dosage: z.string().min(1).max(100),
  frequency: z.string().min(1).max(100),
  duration: z.string().min(1).max(100),
  notes: z.string().max(500).optional(),
});

export type Medication = z.infer<typeof medicationSchema>;

export const createPrescriptionSchema = z.object({
  medications: z.array(medicationSchema).min(1, "At least one medication is required"),
  instructions: z.string().max(2000).optional(),
  expiresAt: z.coerce.date().optional(),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
