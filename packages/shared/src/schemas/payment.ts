import { z } from "zod";

/** Kenyan phone in any common format → normalised to 254XXXXXXXXX on the server. */
const kenyanPhone = z
  .string()
  .trim()
  .regex(/^(\+?254|0)[0-9]{9}$/, "Enter a valid Kenyan phone number (e.g. 0712345678)");

export const mpesaStkSchema = z.object({
  appointmentId: z.string().uuid("Invalid appointment ID"),
  phoneNumber: kenyanPhone,
});
export type MpesaStkInput = z.infer<typeof mpesaStkSchema>;

/** Daraja STK-push callback payload shape (the part we care about). */
export const mpesaCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string(),
      CheckoutRequestID: z.string(),
      ResultCode: z.number(),
      ResultDesc: z.string(),
      CallbackMetadata: z
        .object({
          Item: z.array(
            z.object({
              Name: z.string(),
              Value: z.union([z.string(), z.number()]).optional(),
            }),
          ),
        })
        .optional(),
    }),
  }),
});
export type MpesaCallback = z.infer<typeof mpesaCallbackSchema>;

/**
 * Jenga STK/IPN callback — the exact shape varies (confirmation callback vs IPN),
 * so this is intentionally loose; the settlement service extracts fields
 * defensively. Confirm the precise shape against a real Jenga UAT transaction.
 */
export const jengaCallbackSchema = z.record(z.string(), z.unknown());
export type JengaCallback = z.infer<typeof jengaCallbackSchema>;

/** Jenga PGW hosted-checkout redirect callback (query params on the browser redirect). */
export const jengaPgwCallbackSchema = z.object({
  transactionId: z.string(),
  status: z.string(),
  amount: z.string(),
  orderReference: z.string(),
  hash: z.string(),
  desc: z.string().optional(),
  date: z.string().optional(),
  extraData: z.string().optional(),
});
export type JengaPgwCallback = z.infer<typeof jengaPgwCallbackSchema>;

export const paymentsQuerySchema = z.object({
  status: z.enum(["pending", "awaiting_verification", "completed", "failed", "refunded", "cancelled"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type PaymentsQuery = z.infer<typeof paymentsQuerySchema>;

// ── Interim Till payment mode ────────────────────────────────────────────────
// One polymorphic Payment table now backs every surface (appointment/order/home
// visit/ambulance/lab order), so Till verification is just Payment rows with
// status "awaiting_verification" — `context` mirrors Payment.subjectType.

export const TILL_CONTEXTS = ["appointment", "order", "home_visit", "ambulance", "lab_order"] as const;
export type TillContext = (typeof TILL_CONTEXTS)[number];

/** Patient reports the M-Pesa confirmation code for a Till payment. */
export const submitTillSchema = z.object({
  gatewayRef: z.string().min(1),
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{8,15}$/, "Enter the M-Pesa confirmation code (e.g. SLK5H2X9QA)")
    .transform((s) => s.toUpperCase()),
});
export type SubmitTillInput = z.infer<typeof submitTillSchema>;

/** Admin decision on a Till payment awaiting verification. `id` is the Payment id. */
export const verifyTillSchema = z.object({
  id: z.string().uuid(),
  approve: z.boolean(),
});
export type VerifyTillInput = z.infer<typeof verifyTillSchema>;

/** One row in the admin Till-verification queue. */
export interface TillVerificationItem {
  context: TillContext;
  id: string;
  code: string;
  amountKes: number;
  phone: string;
  patientName: string;
  description: string;
  submittedAt: string;
}
export interface TillVerificationList {
  items: TillVerificationItem[];
  total: number;
}
