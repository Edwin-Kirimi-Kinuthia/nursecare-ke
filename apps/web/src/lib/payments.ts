/**
 * Client-side payment configuration. Mirrors the server's `PAYMENTS_MODE`.
 *
 * In `till` mode the app shows manual "Buy Goods" Till instructions and collects the
 * M-Pesa confirmation code for admin verification (interim, no Daraja API needed).
 * In `daraja` mode it uses the automated STK-push flow.
 */
export const PAYMENTS_MODE: "daraja" | "till" =
  process.env.NEXT_PUBLIC_PAYMENTS_MODE === "till" ? "till" : "daraja";

export const IS_TILL_MODE = PAYMENTS_MODE === "till";

export const TILL_NUMBER = process.env.NEXT_PUBLIC_MPESA_TILL_NUMBER ?? "3396662";
export const TILL_NAME = process.env.NEXT_PUBLIC_MPESA_TILL_NAME ?? "Edwin Kinuthia";
