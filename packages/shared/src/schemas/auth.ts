import { z } from "zod";

/**
 * Every role the system knows, for typing responses. NOT what self-signup
 * accepts — see SELF_SIGNUP_ROLES.
 */
export const ALL_ROLES = [
  "patient",
  "doctor",
  "nurse",
  "physio",
  "pharmacy",
  "vendor",
  "admin",
] as const;

/**
 * What POST /auth/register will actually create: a patient, and nothing else.
 *
 * Care roles carry powers patients don't have — they appear in the public
 * provider directory, take bookings, and write clinical notes and
 * prescriptions — so they are only ever granted after a licence is reviewed.
 * They arrive through /providers/apply (admin-approved) or by direct admin
 * recruitment; vendors through /vendors/apply; admin is provisioned by hand.
 *
 * This used to accept doctor/nurse/physio/pharmacy, which let anyone POST
 * `role: "doctor"` straight to the register endpoint and receive a provider
 * profile with no review at all.
 */
export const SELF_SIGNUP_ROLES = ["patient"] as const;

/** Kenyan/international phone in E.164-ish form, e.g. +254712345678. */
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{9,15}$/, "Enter a valid phone number");

/**
 * Password rules, shared by every form that sets one (signup, provider and
 * vendor applications, invite/reset, and self-service change) so the bar can
 * never drift between them.
 *
 * Length does more for strength than any single character class, so 10 is the
 * floor rather than 8. The classes are still required because they rule out the
 * long-but-trivial strings ("password123", a name plus a year) that dominate
 * real credential-stuffing lists.
 */
export const PASSWORD_MIN_LENGTH = 10;

/** The handful of patterns that survive the class checks but are still guessable. */
const WEAK_PASSWORD_PATTERNS = [
  /^p?a?ssw[o0]rd/i,
  /^qwerty/i,
  /^welcome/i,
  /^letmein/i,
  /^admin/i,
  /^carebora/i,
  /(.)\1{4,}/, // aaaaa
  /0?123456/,
];

/**
 * The rules as data, so a form can show a live checklist instead of revealing
 * one failure at a time on submit.
 *
 * This is the single source of truth: `passwordSchema` below is derived from
 * it, so the checklist a user works against and the validation the server
 * applies cannot drift apart — a button that looks enabled always submits.
 */
export const PASSWORD_RULES: { label: string; message: string; test: (v: string) => boolean }[] = [
  {
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    test: (v) => v.length >= PASSWORD_MIN_LENGTH,
  },
  { label: "An uppercase letter", message: "Add at least one uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "A lowercase letter", message: "Add at least one lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "A number", message: "Add at least one number", test: (v) => /[0-9]/.test(v) },
  { label: "A symbol (! ? @ #)", message: "Add at least one symbol (e.g. ! ? @ #)", test: (v) => /[^A-Za-z0-9]/.test(v) },
  {
    label: "Not an obvious pattern",
    message: "That password is too easy to guess — try something less predictable",
    test: (v) => !WEAK_PASSWORD_PATTERNS.some((re) => re.test(v)),
  },
];

/** True when a candidate satisfies every rule — for disabling submit buttons. */
export function passwordMeetsRules(value: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(value));
}

export const passwordSchema = PASSWORD_RULES.reduce(
  (schema, rule) => schema.refine(rule.test, rule.message),
  z.string().max(128, "Password must be at most 128 characters") as z.ZodType<string>,
);


export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Name is too short").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: phoneSchema.optional(),
  password: passwordSchema,
  role: z.enum(SELF_SIGNUP_ROLES).default("patient"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** A file read into a base64 data: URL on the client — same convention as every other upload in the app. */
const dataUrlSchema = z.string().trim().regex(/^data:[-\w.+]+\/[-\w.+]+;base64,/, "Expected an uploaded file");

/** Application to join as a healthcare provider — creates a pending profile for admin review. */
export const providerApplicationSchema = z.object({
  fullName: z.string().trim().min(2, "Name is too short").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: phoneSchema.optional(),
  password: passwordSchema,
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
  password: passwordSchema,
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
  newPassword: passwordSchema,
});
export type ConfirmChangePasswordInput = z.infer<typeof confirmChangePasswordSchema>;

/** Request a password-reset email. Always succeeds from the caller's view — doesn't reveal whether the address is registered. */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Delete your own account. `password` is required whenever the account has one
 * (it proves it is really you, not someone holding a lost phone); accounts that
 * only ever signed in with Google or Facebook have none, and confirm with the
 * phrase alone. The phrase exists so a mis-tap can't do it.
 */
export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(128).optional(),
  confirm: z.literal("DELETE"),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

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
  role: (typeof ALL_ROLES)[number];
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
