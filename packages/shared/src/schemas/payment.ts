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

export const paymentsQuerySchema = z.object({
  status: z.enum(["pending", "completed", "failed", "refunded", "cancelled"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type PaymentsQuery = z.infer<typeof paymentsQuerySchema>;
