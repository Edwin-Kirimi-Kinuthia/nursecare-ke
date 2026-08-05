/**
 * Unified payment-initiation dispatch. `paymentService` calls this once; it
 * branches on the active gateway (`PAYMENTS_MODE`) so the rest of the codebase
 * never touches Daraja/Jenga/Till specifics directly. This is the seam the v1
 * `initiateStkPush()` used to be — kept generic so adding a gateway later means
 * one new branch here, not a change to every caller.
 */
import type { PaymentGateway, PaymentSubject } from "@carebora/db";
import { initiateStkPush, normaliseMpesaPhone } from "./daraja";
import { initiateJengaStk } from "./jenga/stk";
import { buildPgwCheckout, type PgwCheckout } from "./jenga/pgw";
import { resolveGateway, generateGatewayRef, tillReference } from "./mode";
import { getEnv } from "../config/env";

export interface InitiatePaymentParams {
  subjectType: PaymentSubject;
  amountKes: number;
  phoneNumber: string; // raw, will be normalised for M-Pesa gateways
  description: string;
  refPrefix: string; // short subject-type prefix, e.g. "APT", "ORD", "HV"
  patientName: string;
  patientEmail: string;
}

export interface InitiatePaymentResult {
  gateway: PaymentGateway;
  gatewayRef: string;
  gatewayTxnRef: string | null;
  customerMessage: string;
  /** Present only for jenga_pgw — the client renders this as an auto-submitting form. */
  redirect: PgwCheckout | null;
  rawInitResponse: unknown;
}

export async function initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
  const gateway = resolveGateway(params.subjectType);

  if (gateway === "till") {
    return {
      gateway,
      gatewayRef: tillReference(),
      gatewayTxnRef: null,
      customerMessage: "Awaiting Till payment confirmation",
      redirect: null,
      rawInitResponse: null,
    };
  }

  if (gateway === "jenga_stk") {
    const phone = normaliseMpesaPhone(params.phoneNumber);
    const gatewayRef = generateGatewayRef(params.refPrefix);
    const result = await initiateJengaStk({
      gatewayRef,
      amount: params.amountKes,
      phone,
      description: params.description,
      patientName: params.patientName,
      patientEmail: params.patientEmail,
    });
    return {
      gateway,
      gatewayRef: result.gatewayRef,
      gatewayTxnRef: result.paymentReference,
      customerMessage: result.customerMessage,
      redirect: null,
      rawInitResponse: result,
    };
  }

  if (gateway === "jenga_pgw") {
    const env = getEnv();
    if (!env.JENGA_CALLBACK_URL) throw new Error("JENGA_CALLBACK_URL not set");
    const gatewayRef = generateGatewayRef(params.refPrefix);
    const [firstName, ...rest] = params.patientName.trim().split(/\s+/);
    const redirect = buildPgwCheckout({
      gatewayRef,
      amountKes: params.amountKes,
      description: params.description,
      customerFirstName: firstName || params.patientName,
      customerLastName: rest.join(" ") || firstName || params.patientName,
      customerEmail: params.patientEmail,
      customerPhone: normaliseMpesaPhone(params.phoneNumber),
      callbackUrl: `${env.JENGA_CALLBACK_URL}/pgw`,
    });
    return {
      gateway,
      gatewayRef,
      gatewayTxnRef: null,
      customerMessage: "Redirecting to secure checkout",
      redirect,
      rawInitResponse: null,
    };
  }

  // mpesa_daraja (legacy)
  const phone = normaliseMpesaPhone(params.phoneNumber);
  const push = await initiateStkPush({
    amount: params.amountKes,
    phone,
    accountRef: params.refPrefix,
    description: params.description,
  });
  return {
    gateway,
    gatewayRef: push.checkoutRequestId,
    gatewayTxnRef: push.merchantRequestId,
    customerMessage: push.customerMessage,
    redirect: null,
    rawInitResponse: push,
  };
}
