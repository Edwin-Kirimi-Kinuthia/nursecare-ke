import { z } from "zod";

/**
 * Every server env var CareBora reads, validated once on first use — not at import
 * time, since Next.js builds (and this package's typecheck) must succeed without a
 * live environment. Before this module existed, a bad/missing value (e.g. a blank
 * MPESA_SHORTCODE) silently produced a wrong-but-valid-looking config; now it throws
 * a single readable error naming every offending var.
 */
const envSchema = z.object({
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),

  // A "family", not a single gateway: within jenga mode, order checkouts use the
  // hosted PGW while every other subject (appointment/home-visit/…) uses STK push.
  PAYMENTS_MODE: z.enum(["jenga", "till", "mpesa_daraja"]).default("mpesa_daraja"),
  PLATFORM_FEE_PERCENT: z.coerce.number().min(0).max(100).default(10),

  MPESA_CONSUMER_KEY: z.string().optional(),
  MPESA_CONSUMER_SECRET: z.string().optional(),
  MPESA_SHORTCODE: z.string().optional(),
  MPESA_PASSKEY: z.string().optional(),
  MPESA_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  MPESA_CALLBACK_URL: z.string().optional(),

  JENGA_ENV: z.enum(["uat", "production"]).default("uat"),
  JENGA_API_KEY: z.string().optional(),
  JENGA_MERCHANT_CODE: z.string().optional(),
  JENGA_CONSUMER_SECRET: z.string().optional(),
  JENGA_PRIVATE_KEY_B64: z.string().optional(),
  JENGA_CALLBACK_URL: z.string().optional(),
  JENGA_PGW_TOKEN: z.string().optional(),

  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  LIVEKIT_URL: z.string().optional(),

  AT_API_KEY: z.string().optional(),
  AT_USERNAME: z.string().default("sandbox"),
  RESEND_API_KEY: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Parses and validates `process.env` on first call; result is cached for the process lifetime. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test-only: clears the cache so a test can re-parse after mutating process.env. */
export function __resetEnvCacheForTests(): void {
  cached = undefined;
}
