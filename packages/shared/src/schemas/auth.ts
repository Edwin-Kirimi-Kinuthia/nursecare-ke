import { z } from "zod";

/** Roles a user can self-register as (admin is provisioned, never self-signup). */
export const SIGNUP_ROLES = [
  "patient",
  "doctor",
  "nurse",
  "physio",
  "pharmacy",
] as const;

/** Kenyan/international phone in E.164-ish form, e.g. +254712345678. */
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{9,15}$/, "Enter a valid phone number");

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Name is too short").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: phoneSchema.optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  role: z.enum(SIGNUP_ROLES).default("patient"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** Application to join as a healthcare provider — creates a pending profile for admin review. */
export const providerApplicationSchema = z.object({
  fullName: z.string().trim().min(2, "Name is too short").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: phoneSchema.optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  role: z.enum(["doctor", "nurse", "physio", "pharmacy"]),
  specialty: z.string().trim().min(2, "Specialty is required").max(100),
  licenceNumber: z.string().trim().min(2, "Licence number is required").max(60),
  licenceBody: z.string().trim().max(120).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
  qualifications: z.string().max(1000).optional(),
});
export type ProviderApplicationInput = z.infer<typeof providerApplicationSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const verifyEmailSchema = z.object({
  code: z.string().trim().regex(/^[0-9]{6}$/, "Enter the 6-digit code"),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

/** Social login providers wired up for "Continue with ...". */
export const OAUTH_PROVIDERS = ["google", "facebook"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

/** Admin recruits a provider directly — skips the public apply-and-review queue. */
export const adminCreateProviderSchema = z.object({
  fullName: z.string().trim().min(2, "Name is too short").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: phoneSchema.optional(),
  role: z.enum(["doctor", "nurse", "physio", "pharmacy"]),
  specialty: z.string().trim().max(100).optional(),
  licenceNumber: z.string().trim().max(60).optional(),
});
export type AdminCreateProviderInput = z.infer<typeof adminCreateProviderSchema>;

/** Consume an emailed invite/reset link: set a password and sign in. */
export const setPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

/** Rotate your own password — requires proving you know the current one. */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** Confirmation phrase required to run the one-time launch reset. */
export const LAUNCH_RESET_CONFIRM_PHRASE = "RESET TO LAUNCH";
export const launchResetSchema = z.object({
  confirm: z.literal(LAUNCH_RESET_CONFIRM_PHRASE),
});
export type LaunchResetInput = z.infer<typeof launchResetSchema>;

/** Shape returned for the authenticated user across the API. */
export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: (typeof SIGNUP_ROLES)[number] | "vendor" | "admin";
  avatarUrl: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string | Date;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}
