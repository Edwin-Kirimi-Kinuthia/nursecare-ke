/** Safaricom M-Pesa Daraja API client. Uses only Node's built-in fetch. */
import { ApiError } from "@carebora/shared";

function baseUrl() {
  return process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function timestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(0, 14);
}

function stkPassword(ts: string): string {
  const shortcode = process.env.MPESA_SHORTCODE ?? "";
  const passkey = process.env.MPESA_PASSKEY ?? "";
  return Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
}

/** Normalise a Kenyan phone number to 254XXXXXXXXX (12 digits). */
export function normaliseMpesaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  return digits;
}

async function getOAuthToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET not set");

  const creds = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(
    `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${creds}` } },
  );
  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`Daraja OAuth failed: ${json.error ?? res.status}`);
  }
  return json.access_token;
}

export interface StkPushResult {
  merchantRequestId: string;
  checkoutRequestId: string;
  customerMessage: string;
}

export async function stkPush(params: {
  amount: number;
  phone: string; // normalised 254XXXXXXXXX
  accountRef: string;
  description: string;
}): Promise<StkPushResult> {
  const shortcode = process.env.MPESA_SHORTCODE;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  if (!shortcode || !callbackUrl) {
    throw new Error("MPESA_SHORTCODE / MPESA_CALLBACK_URL not set");
  }

  const token = await getOAuthToken();
  const ts = timestamp();

  const body = {
    BusinessShortCode: shortcode,
    Password: stkPassword(ts),
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: params.amount,
    PartyA: params.phone,
    PartyB: shortcode,
    PhoneNumber: params.phone,
    CallBackURL: callbackUrl,
    AccountReference: params.accountRef,
    TransactionDesc: params.description,
  };

  const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as {
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    CustomerMessage?: string;
    errorMessage?: string;
    ResponseDescription?: string;
  };

  if (!res.ok || !json.CheckoutRequestID) {
    throw new Error(`Daraja STK push failed: ${json.errorMessage ?? json.ResponseDescription ?? res.status}`);
  }

  return {
    merchantRequestId: json.MerchantRequestID!,
    checkoutRequestId: json.CheckoutRequestID,
    customerMessage: json.CustomerMessage ?? "Payment request sent",
  };
}

/**
 * Service-layer entry point for initiating a payment. Wraps the raw stkPush so
 * that any gateway failure (misconfiguration, OAuth error, Daraja outage, or
 * network error) surfaces as a clean 503 to the client instead of a generic 500.
 * The underlying cause is preserved in `details` for server-side logging.
 */
export async function initiateStkPush(params: {
  amount: number;
  phone: string;
  accountRef: string;
  description: string;
}): Promise<StkPushResult> {
  try {
    return await stkPush(params);
  } catch (err) {
    throw ApiError.serviceUnavailable(
      "Could not reach M-Pesa to start your payment. Please try again shortly.",
      { cause: err instanceof Error ? err.message : String(err) },
    );
  }
}
