import { z } from "zod";

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{9,15}$/, "Enter a valid phone number");

export const patchPatientProfileSchema = z.object({
  dateOfBirth: z.coerce.date().optional(),
  gender: z.string().max(30).optional(),
  county: z.string().max(60).optional(),
  town: z.string().max(60).optional(),
  addressLine: z.string().max(255).optional(),
  bloodGroup: z.string().max(10).optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  emergencyContactName: z.string().max(120).optional(),
  emergencyContactPhone: phone.optional(),
});

export type PatchPatientProfileInput = z.infer<typeof patchPatientProfileSchema>;

export const patchProviderProfileSchema = z.object({
  specialty: z.string().max(80).optional(),
  subSpecialty: z.string().max(80).optional(),
  bio: z.string().max(2000).optional(),
  licenceNumber: z.string().max(60).optional(),
  licenceBody: z.string().max(120).optional(),
  yearsExperience: z.number().int().min(0).max(60).optional(),
  languages: z.array(z.string()).optional(),
  qualifications: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
  consultationFeeKes: z.number().int().min(0).optional(),
  homeVisitFeeKes: z.number().int().min(0).optional(),
  county: z.string().max(60).optional(),
  town: z.string().max(60).optional(),
  isAvailable: z.boolean().optional(),
});

export type PatchProviderProfileInput = z.infer<typeof patchProviderProfileSchema>;
