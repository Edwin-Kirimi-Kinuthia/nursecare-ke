import { z } from "zod";

const userRoleEnum = z.enum(["patient", "doctor", "nurse", "physio", "pharmacy", "admin"]);
const verificationStatusEnum = z.enum(["unverified", "pending", "in_review", "verified", "rejected"]);

export const adminUsersQuerySchema = z.object({
  role: userRoleEnum.optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;

export const adminPatchUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: userRoleEnum.optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });
export type AdminPatchUserInput = z.infer<typeof adminPatchUserSchema>;

export const verificationsQuerySchema = z.object({
  status: verificationStatusEnum.optional(),
  specialty: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type VerificationsQuery = z.infer<typeof verificationsQuerySchema>;

export const reviewVerificationSchema = z.object({
  status: z.enum(["in_review", "verified", "rejected"]),
  notes: z.string().max(1000).optional(),
});
export type ReviewVerificationInput = z.infer<typeof reviewVerificationSchema>;

export const auditLogsQuerySchema = z.object({
  actorId: z.string().uuid().optional(),
  action: z.string().max(100).optional(),
  entityType: z.string().max(100).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;
