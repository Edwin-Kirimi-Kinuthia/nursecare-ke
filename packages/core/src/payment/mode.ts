import { randomUUID } from "node:crypto";

/**
 * Payment mode.
 *
 * - `daraja`  — automated M-Pesa STK push + callback (needs live Daraja API creds).
 * - `till`    — interim manual "Buy Goods" Till: the patient pays on their phone and
 *               enters the M-Pesa confirmation code, then an admin verifies it before
 *               the service is unlocked. No Daraja credentials required.
 *
 * Flip with the `PAYMENTS_MODE` env var. Defaults to `daraja`.
 */
export const PAYMENTS_MODE: "daraja" | "till" =
  process.env.PAYMENTS_MODE === "till" ? "till" : "daraja";

export const isTillMode = () => PAYMENTS_MODE === "till";

/** Synthetic reference used in place of a Daraja CheckoutRequestID for Till payments. */
export const tillReference = () => `TILL-${randomUUID()}`;
