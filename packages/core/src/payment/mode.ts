import { randomUUID } from "node:crypto";
import type { PaymentGateway, PaymentSubject } from "@carebora/db";
import { getEnv } from "../config/env";

/**
 * Which payment gateway *family* is active, driven by the `PAYMENTS_MODE` env var:
 *
 * - `jenga`        — Jenga API. Order checkouts use the hosted PGW (cards/Equitel/
 *                    bank/M-Pesa in one screen); every other subject (appointment,
 *                    home visit, …) uses server-to-server STK push.
 * - `till`         — interim manual "Buy Goods" Till: the patient enters the M-Pesa
 *                    confirmation code, an admin verifies it. No gateway credentials needed.
 * - `mpesa_daraja` — legacy direct Safaricom Daraja STK push for every subject, kept
 *                    for environments without Jenga credentials yet.
 */
export function currentGatewayFamily() {
  return getEnv().PAYMENTS_MODE;
}

/** Resolves the family into the concrete gateway for a given payment subject. */
export function resolveGateway(subjectType: PaymentSubject): PaymentGateway {
  const family = currentGatewayFamily();
  if (family === "till") return "till";
  if (family === "mpesa_daraja") return "mpesa_daraja";
  return subjectType === "order" ? "jenga_pgw" : "jenga_stk";
}

export const isTillMode = () => currentGatewayFamily() === "till";

/** Synthetic reference used in place of a real gateway checkout id for Till payments. */
export const tillReference = () => `TILL-${randomUUID()}`;

/** Our own generated order reference for gateways that require one upfront (Jenga). */
export const generateGatewayRef = (prefix: string) =>
  `${prefix}${randomUUID().replace(/-/g, "").slice(0, 16)}`.toUpperCase();
