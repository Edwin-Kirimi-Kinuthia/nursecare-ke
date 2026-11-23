import { ApiError } from "@carebora/shared";
import { z } from "zod";

const configSchema = z.object({
  MPESA_B2C_ENV: z.enum(["sandbox", "production"]),
  MPESA_B2C_CONSUMER_KEY: z.string().min(1),
  MPESA_B2C_CONSUMER_SECRET: z.string().min(1),
  MPESA_B2C_SHORTCODE: z.string().regex(/^\d{5,7}$/),
  MPESA_B2C_INITIATOR: z.string().min(1),
  MPESA_B2C_SECURITY_CREDENTIAL: z.string().min(1),
  MPESA_B2C_CALLBACK_BASE_URL: z.string().url(),
});
export function payoutsMode() { return process.env.PAYOUTS_MODE === "mpesa_b2c" ? "mpesa_b2c" : "manual"; }
export function b2cConfig() {
  const parsed = configSchema.safeParse(process.env);
  if (!parsed.success) throw ApiError.serviceUnavailable("M-Pesa withdrawals are not configured yet. Contact support.");
  const c = parsed.data;
  const url = new URL(c.MPESA_B2C_CALLBACK_BASE_URL);
  if (c.MPESA_B2C_ENV === "production" && url.protocol !== "https:") throw ApiError.serviceUnavailable("M-Pesa withdrawal callbacks require HTTPS");
  if (url.search || url.hash) throw ApiError.serviceUnavailable("Invalid M-Pesa withdrawal callback base URL");
  return c;
}
export type B2cConfig = ReturnType<typeof b2cConfig>;
export const b2cBase = (c: B2cConfig) => c.MPESA_B2C_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
export async function b2cOAuth(c: B2cConfig) {
  const r = await fetch(`${b2cBase(c)}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${Buffer.from(`${c.MPESA_B2C_CONSUMER_KEY}:${c.MPESA_B2C_CONSUMER_SECRET}`).toString("base64")}` },
    signal: AbortSignal.timeout(15_000),
  });
  const j = await r.json() as { access_token?: string };
  if (!r.ok || !j.access_token) throw ApiError.serviceUnavailable("M-Pesa could not authorize the withdrawal. Your request remains pending.");
  return j.access_token;
}
