import { z } from "zod";
export const withdrawalRequestSchema = z.object({
  amountKes: z.number().int().min(1).max(250000),
  phoneNumber: z.string().trim().transform(p => p.replace(/[\s+-]/g, "").replace(/^0/, "254")).pipe(z.string().regex(/^254[17]\d{8}$/, "Enter a Kenyan M-Pesa number")),
  requestKey: z.string().uuid(),
});
export const processWithdrawalSchema = z.object({
  status: z.enum(["processing", "paid", "failed"]),
  reference: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{10}$/, "Enter the 10-character M-Pesa receipt").optional(),
});
export const navigationQuestionSchema = z.object({
  message: z.string().trim().min(1).max(500),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1200) })).max(8).optional(),
  page: z.string().max(160).regex(/^\/[a-zA-Z0-9/_()-]*$/).optional(),
});
export type NavigationQuestion = z.infer<typeof navigationQuestionSchema>;

export const b2cResultSchema = z.object({ Result: z.object({
  ResultCode: z.coerce.number().int(), ResultDesc: z.string().max(2000),
  OriginatorConversationID: z.string().max(150).optional(),
  ConversationID: z.string().max(150).optional(), TransactionID: z.string().max(100).optional(),
  ResultParameters: z.object({ ResultParameter: z.array(z.object({ Key: z.string().max(100), Value: z.union([z.string().max(1000), z.number()]).optional() })).max(40) }).optional(),
}) });
export const reconcileWithdrawalSchema = z.object({
  outcome: z.enum(["paid", "failed"]),
  reference: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{10}$/).optional(),
  note: z.string().trim().min(10).max(1000),
});
