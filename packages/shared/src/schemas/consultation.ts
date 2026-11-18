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

const certificateDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")
  .refine((value) => Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, "Choose a valid date");
const signingImage = z.string().max(700_000, "Use an image smaller than 500 KB")
  .regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/, "Upload a PNG or JPEG image of your signature");

export const issueSickOffSchema = z.object({
  fromDate: certificateDate,
  throughDate: certificateDate,
  advice: z.string().trim().max(1000).optional(),
  signatureDataUrl: signingImage,
  confirm: z.literal(true, { errorMap: () => ({ message: "Confirm that you assessed the patient and authorize this certificate" }) }),
}).refine((v) => v.throughDate >= v.fromDate, { path: ["throughDate"], message: "The last day must be on or after the first day" })
  .refine((v) => Date.parse(v.throughDate) - Date.parse(v.fromDate) <= 365 * 86_400_000, { path: ["throughDate"], message: "Choose a period of at most one year" });
export type IssueSickOffInput = z.infer<typeof issueSickOffSchema>;
