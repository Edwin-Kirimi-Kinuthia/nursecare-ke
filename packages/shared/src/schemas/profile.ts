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

/** A file read into a base64 data: URL on the client — same convention as every other upload. */
const avatarSchema = z
  .string()
  .trim()
  .regex(/^data:image\/[-\w.+]+;base64,/, "Upload an image file")
  .or(z.string().trim().url());

/**
 * Fields on the account itself, as opposed to the patient or provider profile
 * hanging off it. Separate endpoint because these are shared by every role —
 * a provider updating their display photo and a patient correcting their phone
 * are the same operation.
 *
 * Email is deliberately absent: it is the login identity and the address every
 * verification and OTP goes to, so changing it needs its own verified flow
 * rather than a quiet profile save.
 */
export const patchMeSchema = z.object({
  fullName: z.string().trim().min(2, "Name is too short").max(120).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{9,15}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  avatarUrl: avatarSchema.nullable().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });
export type PatchMeInput = z.infer<typeof patchMeSchema>;

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
