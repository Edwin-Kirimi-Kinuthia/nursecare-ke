/**
 * Jenga M-Pesa STK push (wallet-based settlement, v3.0) — the server-to-server
 * equivalent of Daraja's STK push, used for consultation/quick payments.
 * https://developer.jengahq.io/api-explorer/receive-money/mpesa-stk-push/wallet-based-settlement/mpesa-stk-push-init
 */
import { ApiError } from "@carebora/shared";
import { getEnv } from "../../config/env";
import { getJengaToken, jengaBaseUrl } from "./auth";
import { signJenga } from "./signature";

export interface JengaStkResult {
  gatewayRef: string; // our orderReference, echoed back
  paymentReference: string;
  customerMessage: string;
}

interface StkInitResponse {
  status?: boolean;
  code?: string;
  message?: string;
  data?: { paymentReference?: string; orderReference?: string };
}

/** Initiate an STK push. `gatewayRef` is our own generated orderReference (>= 8 alphanumeric chars). */
export async function stkPushInit(params: {
  gatewayRef: string;
  amount: number;
  phone: string; // normalised 254XXXXXXXXX
  description: string;
  patientName: string;
  patientEmail: string;
}): Promise<JengaStkResult> {
  const env = getEnv();
  if (!env.JENGA_CALLBACK_URL) throw new Error("JENGA_CALLBACK_URL not set");

  const paymentReference = `PR${params.gatewayRef.slice(-10)}`;
  // Signature order (per Jenga docs): orderReference + paymentCurrency + msisdn + paymentAmount
  const signature = signJenga(`${params.gatewayRef}KES${params.phone}${params.amount}`);

  const body = {
    order: {
      orderReference: params.gatewayRef,
      orderAmount: params.amount,
      orderCurrency: "KES",
      source: "APICHECKOUT",
      countryCode: "KE",
      description: params.description,
    },
    customer: {
      name: params.patientName,
      email: params.patientEmail,
      phoneNumber: params.phone,
      identityNumber: "0000000",
    },
    payment: {
      paymentReference,
      paymentCurrency: "KES",
      channel: "MOBILE",
      service: "MPESA",
      provider: "JENGA",
      callbackUrl: env.JENGA_CALLBACK_URL,
      details: { msisdn: params.phone, paymentAmount: params.amount },
    },
  };

  const token = await getJengaToken();
  const res = await fetch(`${jengaBaseUrl()}/api-checkout/mpesa-stk-push/v3.0/init`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Signature: signature,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as StkInitResponse;
  if (!res.ok || json.status !== true) {
    throw new Error(`Jenga STK push failed: ${json.message ?? res.status}`);
  }

  return {
    gatewayRef: params.gatewayRef,
    paymentReference: json.data?.paymentReference ?? paymentReference,
    customerMessage: json.message ?? "Payment request sent",
  };
}

/** Wraps stkPushInit so gateway failures surface as a clean 503, matching the Daraja client's contract. */
export async function initiateJengaStk(params: {
  gatewayRef: string;
  amount: number;
  phone: string;
  description: string;
  patientName: string;
  patientEmail: string;
}): Promise<JengaStkResult> {
  try {
    return await stkPushInit(params);
  } catch (err) {
    throw ApiError.serviceUnavailable(
      "Could not reach the payment gateway to start your payment. Please try again shortly.",
      { cause: err instanceof Error ? err.message : String(err) },
    );
  }
}

export interface JengaOrderStatus {
  found: boolean;
  status?: "SUCCESS" | "PENDING" | "FAILED" | string;
  gatewayTxnRef?: string;
}

/**
 * Queries the real-time status of an order — used for reconciliation of payments
 * stuck `pending` (dropped/delayed callback) and to confirm an unsigned STK
 * callback before trusting it.
 */
export async function queryOrderStatus(gatewayRef: string): Promise<JengaOrderStatus> {
  const token = await getJengaToken();
  const res = await fetch(`${jengaBaseUrl()}/api-checkout/mpesa-stk-push/v3.0/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderReference: gatewayRef }),
  });
  if (res.status === 404) return { found: false };
  const json = (await res.json()) as { status?: boolean; data?: { status?: string; transactionReference?: string } };
  if (!res.ok) return { found: false };
  return { found: true, status: json.data?.status, gatewayTxnRef: json.data?.transactionReference };
}
