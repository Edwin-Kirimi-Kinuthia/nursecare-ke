import { z } from "zod";

export const allergySeverityEnum = z.enum(["mild", "moderate", "severe"]);
export const conditionStatusEnum = z.enum(["active", "resolved", "chronic"]);
export const medicalDocumentTypeEnum = z.enum([
  "lab_result", "imaging", "discharge_summary", "referral", "insurance", "prescription", "other",
]);

export const createAllergySchema = z.object({
  substance: z.string().trim().min(2).max(200),
  severity: allergySeverityEnum.default("mild"),
  reaction: z.string().trim().max(500).optional(),
});
export type CreateAllergyInput = z.infer<typeof createAllergySchema>;

export const patchAllergySchema = z.object({
  severity: allergySeverityEnum.optional(),
  reaction: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });
export type PatchAllergyInput = z.infer<typeof patchAllergySchema>;

export const createConditionSchema = z.object({
  name: z.string().trim().min(2).max(200),
  icd10Code: z.string().trim().max(20).optional(),
  status: conditionStatusEnum.default("active"),
  diagnosedAt: z.string().datetime().optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type CreateConditionInput = z.infer<typeof createConditionSchema>;

export const patchConditionSchema = createConditionSchema.partial();
export type PatchConditionInput = z.infer<typeof patchConditionSchema>;

export const createMedicationEntrySchema = z.object({
  prescriptionId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(200),
  dosage: z.string().trim().max(100).optional(),
  frequency: z.string().trim().max(100).optional(),
  startedAt: z.string().datetime().optional(),
});
export type CreateMedicationEntryInput = z.infer<typeof createMedicationEntrySchema>;

export const patchMedicationEntrySchema = z.object({
  endedAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });
export type PatchMedicationEntryInput = z.infer<typeof patchMedicationEntrySchema>;

export const createVitalSignSchema = z.object({
  consultationId: z.string().uuid().optional(),
  type: z.string().trim().min(2).max(60),
  value: z.string().trim().min(1).max(60),
  unit: z.string().trim().max(20).optional(),
  recordedAt: z.string().datetime().optional(),
});
export type CreateVitalSignInput = z.infer<typeof createVitalSignSchema>;

export const createImmunizationSchema = z.object({
  vaccine: z.string().trim().min(2).max(200),
  doseNumber: z.coerce.number().int().min(1).max(20).optional(),
  administeredAt: z.string().datetime(),
  administeredBy: z.string().trim().max(200).optional(),
  nextDueAt: z.string().datetime().optional(),
});
export type CreateImmunizationInput = z.infer<typeof createImmunizationSchema>;

export const createMedicalDocumentSchema = z.object({
  type: medicalDocumentTypeEnum.default("other"),
  title: z.string().trim().min(2).max(200),
  fileUrl: z.string().min(10).max(9_000_000),
  consultationId: z.string().uuid().optional(),
});
export type CreateMedicalDocumentInput = z.infer<typeof createMedicalDocumentSchema>;

export const grantAccessSchema = z.object({
  granteeEmail: z.string().trim().toLowerCase().email(),
  scope: z.array(z.string()).default(["all"]),
  expiresAt: z.string().datetime().optional(),
});
export type GrantAccessInput = z.infer<typeof grantAccessSchema>;
