import { z } from "zod";

export const symptomCheckSchema = z.object({
  symptoms: z.string().min(5).max(1000),
  patientAge: z.number().int().min(0).max(150).optional(),
  allergies: z.array(z.string()).max(20).optional(),
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
