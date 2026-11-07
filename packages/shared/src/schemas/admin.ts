import { z } from "zod";

const userRoleEnum = z.enum(["patient", "doctor", "nurse", "physio", "pharmacy", "vendor", "admin"]);
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

/**
 * What an admin may change on someone else's account.
 *
 * Beyond enable/disable and role, this covers the corrections support actually
 * gets asked for — a misspelt name, a wrong phone, a missing photo — and, for
 * care accounts, the clinical profile fields an admin has to be able to fix
 * while verifying a licence.
 *
 * Email stays out: it is the login identity and the address every OTP goes to,
 * so it needs a verified flow rather than an admin edit.
 */
export const adminPatchUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: userRoleEnum.optional(),
  fullName: z.string().trim().min(2, "Name is too short").max(120).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{9,15}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  avatarUrl: z.string().trim().nullable().optional(),
  /** Only applied when the account actually has a provider profile. */
  providerProfile: z
    .object({
      specialty: z.string().trim().max(80).optional(),
      subSpecialty: z.string().trim().max(80).optional(),
      bio: z.string().max(2000).optional(),
      licenceNumber: z.string().trim().max(60).optional(),
      licenceBody: z.string().trim().max(120).optional(),
      yearsExperience: z.number().int().min(0).max(60).optional(),
      consultationFeeKes: z.number().int().min(0).optional(),
      homeVisitFeeKes: z.number().int().min(0).optional(),
      county: z.string().trim().max(60).optional(),
      town: z.string().trim().max(60).optional(),
      verificationStatus: z.enum(["unverified", "pending", "in_review", "verified", "rejected"]).optional(),
    })
    .optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });
export type AdminPatchUserInput = z.infer<typeof adminPatchUserSchema>;

/** Deliberate confirmation before an admin closes the selected user's account. */
export const adminDeleteUserSchema = z.object({
  confirm: z.literal("DELETE"),
});
export type AdminDeleteUserInput = z.infer<typeof adminDeleteUserSchema>;

/** Counts of what a launch reset would delete — shown before the confirm step. */
export interface LaunchResetPreview {
  nonAdminUsers: number;
  organizations: number;
  appointments: number;
  orders: number;
  payments: number;
  homeVisits: number;
  labOrders: number;
  ambulanceRequests: number;
  reviews: number;
}

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
