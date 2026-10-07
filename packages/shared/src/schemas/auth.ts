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

/** A file read into a base64 data: URL on the client — same convention as every other upload in the app. */
const dataUrlSchema = z.string().trim().regex(/^data:[-\w.+]+\/[-\w.+]+;base64,/, "Expected an uploaded file");

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
  /** Scan/photo of their practice licence — what the admin actually reviews against `licenceNumber`. */
  licenceDocumentUrl: dataUrlSchema,
  /** Passport-style photo — shown publicly on their profile once verified. */
  avatarUrl: dataUrlSchema,
});
export type ProviderApplicationInput = z.infer<typeof providerApplicationSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

const otpCodeSchema = z.string().trim().regex(/^[0-9]{6}$/, "Enter the 6-digit code");

/** Step 2 of login: the code emailed after a correct password. */
export const loginVerifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  code: otpCodeSchema,
});
export type LoginVerifyOtpInput = z.infer<typeof loginVerifyOtpSchema>;

export const loginResendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});
export type LoginResendOtpInput = z.infer<typeof loginResendOtpSchema>;

/** What /auth/login returns now — a password match no longer completes login by itself. */
export interface LoginChallengeResult {
  requiresOtp: true;
  email: string;
}

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
  /** Optional here — the admin is already vouching for this provider directly. */
  licenceDocumentUrl: dataUrlSchema.optional(),
  avatarUrl: dataUrlSchema.optional(),
});
export type AdminCreateProviderInput = z.infer<typeof adminCreateProviderSchema>;

/** Consume an emailed invite/reset link: set a password and sign in. */
export const setPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

/** Step 1 of rotating your own password: prove you know the current one to get an emailed code. */
export const requestChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
});
export type RequestChangePasswordInput = z.infer<typeof requestChangePasswordSchema>;

/** Step 2: the emailed code, plus the new password it authorizes setting. */
export const confirmChangePasswordSchema = z.object({
  code: otpCodeSchema,
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
});
export type ConfirmChangePasswordInput = z.infer<typeof confirmChangePasswordSchema>;

/** Request a password-reset email. Always succeeds from the caller's view — doesn't reveal whether the address is registered. */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

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
