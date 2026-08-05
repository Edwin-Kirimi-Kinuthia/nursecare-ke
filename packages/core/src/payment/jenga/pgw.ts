/**
 * Jenga PGW hosted checkout — a browser redirect/form-post flow (cards, Equitel,
 * bank account, and M-Pesa all in one screen), used for pharmacy order checkout
 * where card payment matters. https://developer.jengahq.io/guides/jenga-pgw/checkout-reference
 */
import { getEnv } from "../../config/env";
import { signJenga } from "./signature";

function pgwActionUrl(): string {
  return getEnv().JENGA_ENV === "production"
    ? "https://v3.jengapgw.io/processPayment"
    : "https://v3-uat.jengapgw.io/processPayment";
}

export interface PgwCheckout {
  actionUrl: string;
  fields: Record<string, string>;
}

/**
 * Builds the hidden-form fields the client POSTs to Jenga's checkout URL.
 * `gatewayRef` is our own orderReference (>= 8 alphanumeric chars, enforced by
 * createOrderSchema equivalent at the call site).
 */
export function buildPgwCheckout(params: {
  gatewayRef: string;
  amountKes: number;
  description: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  callbackUrl: string;
}): PgwCheckout {
  const env = getEnv();
  if (!env.JENGA_PGW_TOKEN || !env.JENGA_MERCHANT_CODE) {
    throw new Error("JENGA_PGW_TOKEN / JENGA_MERCHANT_CODE not set");
  }
  const currency = "KES";
  // Secure-mode signature order: merchantCode + orderReference + currency + orderAmount + callbackUrl
  const signature = signJenga(
    `${env.JENGA_MERCHANT_CODE}${params.gatewayRef}${currency}${params.amountKes}${params.callbackUrl}`,
  );

  return {
    actionUrl: pgwActionUrl(),
    fields: {
      token: env.JENGA_PGW_TOKEN,
      merchantCode: env.JENGA_MERCHANT_CODE,
      currency,
      orderAmount: String(params.amountKes),
      orderReference: params.gatewayRef,
      productType: "Product",
      productDescription: params.description.slice(0, 200),
      customerFirstName: params.customerFirstName,
      customerLastName: params.customerLastName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      paymentTimeLimit: "15mins",
      countryCode: "KE",
      callbackUrl: params.callbackUrl,
      signature,
    },
  };
}

export interface PgwCallback {
  transactionId: string;
  status: string; // "paid" on success
  amount: string;
  orderReference: string;
  hash: string;
  desc?: string;
}

/**
 * Verifies the callback's `hash` before trusting it. Jenga's exact PGW callback
 * hash algorithm isn't fully documented publicly — this checks the signature
 * against the same field set/order used to build the checkout request, which is
 * the documented pattern for secure-mode PGW. Confirm against a real UAT
 * transaction once Jenga merchant credentials are available, and adjust the
 * concatenation order here if it doesn't match.
 */
export function verifyPgwCallback(cb: PgwCallback): boolean {
  const env = getEnv();
  if (!env.JENGA_MERCHANT_CODE) return false;
  const expected = signJenga(`${cb.transactionId}${cb.orderReference}${cb.amount}${cb.status}`);
  return expected === cb.hash;
}
