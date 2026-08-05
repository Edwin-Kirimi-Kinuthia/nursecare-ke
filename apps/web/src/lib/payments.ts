/**
 * Client-side payment configuration. Mirrors the server's `PAYMENTS_MODE` family.
 *
 * In `till` mode the app shows manual "Buy Goods" Till instructions and collects the
 * M-Pesa confirmation code for admin verification (no gateway credentials needed).
 * In `jenga` or `mpesa_daraja` mode it uses the automated STK-push / hosted-checkout flow.
 */
export const PAYMENTS_MODE: "jenga" | "till" | "mpesa_daraja" =
  process.env.NEXT_PUBLIC_PAYMENTS_MODE === "till"
    ? "till"
    : process.env.NEXT_PUBLIC_PAYMENTS_MODE === "jenga"
      ? "jenga"
      : "mpesa_daraja";

export const IS_TILL_MODE = PAYMENTS_MODE === "till";

export const TILL_NUMBER = process.env.NEXT_PUBLIC_MPESA_TILL_NUMBER ?? "3396662";
export const TILL_NAME = process.env.NEXT_PUBLIC_MPESA_TILL_NAME ?? "Edwin Kinuthia";
