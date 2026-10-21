import { z } from "zod";

/** Optional patient context that sharpens the advice (all fields optional). */
const patientContext = {
  patientAge: z.number().int().min(0).max(150).optional(),
  sex: z.enum(["female", "male"]).optional(),
  pregnant: z.boolean().optional(),
  duration: z.string().trim().max(80).optional(),
  allergies: z.array(z.string().trim().max(80)).max(20).optional(),
  conditions: z.array(z.string().trim().max(80)).max(20).optional(),
  currentMedicines: z.array(z.string().trim().max(80)).max(20).optional(),
};

export const symptomCheckSchema = z.object({
  symptoms: z.string().trim().min(5).max(1500),
  ...patientContext,
});
export type SymptomCheckInput = z.infer<typeof symptomCheckSchema>;

export const providerMatchSchema = z.object({
  concern: z.string().min(5).max(500),
});
export type ProviderMatchInput = z.infer<typeof providerMatchSchema>;

export const factCheckSchema = z.object({
  question: z.string().min(5).max(1000),
});
export type FactCheckInput = z.infer<typeof factCheckSchema>;

/**
 * The clinicians' assistant (doctors, nurses, physios):
 *  - drug:         a medicine -> routes, doses by population, duration, cautions
 *  - differential: a presentation -> likely diagnoses, work-up, first-line management
 *  - question:     any other clinical question
 */
export const clinicalQuerySchema = z.object({
  mode: z.enum(["drug", "differential", "question"]),
  query: z.string().trim().min(2).max(1500),
  ...patientContext,
  weightKg: z.number().min(0.3).max(400).optional(),
});
export type ClinicalQueryInput = z.infer<typeof clinicalQuerySchema>;
