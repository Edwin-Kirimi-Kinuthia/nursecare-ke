import { z } from "zod";

export function normalizeWhatsAppPhone(value: string): string {
  const phone = value.trim().replace(/[\s().-]/g, "");
  if (/^0[17]\d{8}$/.test(phone)) return `+254${phone.slice(1)}`;
  if (/^254[17]\d{8}$/.test(phone)) return `+${phone}`;
  if (/^00[1-9]\d{8,14}$/.test(phone)) return `+${phone.slice(2)}`;
  return phone;
}

export const whatsAppPhoneSchema = z.string().max(40).transform(normalizeWhatsAppPhone)
  .refine((phone) => /^\+[1-9]\d{8,14}$/.test(phone), "Enter a WhatsApp number with country code, e.g. +254712345678");

export const whatsAppPreferenceSchema = z.object({
  enabled: z.boolean(),
  phoneNumber: whatsAppPhoneSchema.optional(),
});
export type WhatsAppPreferenceInput = z.infer<typeof whatsAppPreferenceSchema>;

export interface WhatsAppPreferences {
  enabled: boolean;
  phoneNumber: string;
  suppressed: boolean;
  deliveryAvailable: boolean;
}

export interface WhatsAppAdminStatus {
  enabled: boolean;
  ready: boolean;
  missing: string[];
  adminNumbers: string[];
  invalidAdminNumbers: number;
  counts: Record<string, number>;
  recent: { id: string; toPhone: string; templateKey: string; status: string; errorCode: string | null; attempts: number; createdAt: string }[];
}
