import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeWhatsAppPhone, whatsAppPhoneSchema } from "@carebora/shared";
import { z } from "zod";

export const WHATSAPP_TEMPLATES = {
  admin_activity: "carebora_admin_activity",
  appointment_confirmed: "carebora_appointment_confirmed",
  provider_invitation: "carebora_provider_invitation",
  provider_ready: "carebora_provider_ready",
  support_reply: "carebora_support_reply",
} as const;
export type WhatsAppTemplate = keyof typeof WHATSAPP_TEMPLATES;

export function whatsAppConfig() {
  const enabled = ["true", "1"].includes(process.env.WHATSAPP_ENABLED ?? "");
  const required = ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_APP_SECRET", "WHATSAPP_VERIFY_TOKEN"];
  const missing = required.filter((key) => !process.env[key]?.trim());
  const raw = (process.env.WHATSAPP_ADMIN_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const adminNumbers = [...new Set(raw.map(normalizeWhatsAppPhone).filter((p) => whatsAppPhoneSchema.safeParse(p).success))];
  return { enabled, ready: enabled && missing.length === 0, missing, adminNumbers, invalidAdminNumbers: raw.filter((p) => !whatsAppPhoneSchema.safeParse(p).success).length };
}

export class WhatsAppSendError extends Error {
  constructor(public code: string, public retryable = false, public uncertain = false) {
    super(code);
  }
}

/** Only approved templates. Never put symptoms, diagnoses or contact messages in these parameters. */
export async function sendWhatsAppTemplate(
  message: { id: string; toPhone: string; templateKey: WhatsAppTemplate; parameters: string[] },
  fetcher: typeof fetch = fetch,
): Promise<string> {
  if (!whatsAppConfig().ready) throw new WhatsAppSendError("configuration_missing");
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const version = process.env.WHATSAPP_API_VERSION || "v25.0";
  if (!/^\d+$/.test(phoneId) || !/^v\d+\.\d+$/.test(version)) throw new WhatsAppSendError("configuration_invalid");
  const templateName = process.env[`WHATSAPP_TEMPLATE_${message.templateKey.toUpperCase()}`] || WHATSAPP_TEMPLATES[message.templateKey];
  let response: Response;
  try {
    response = await fetcher(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", recipient_type: "individual", to: message.toPhone.slice(1), type: "template",
        biz_opaque_callback_data: message.id,
        template: {
          name: templateName,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en" },
          components: [{ type: "body", parameters: message.parameters.map((text) => ({ type: "text", text })) }],
        },
      }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    // A timeout may occur after Meta accepted the message. Do not resend blindly.
    throw new WhatsAppSendError("delivery_unknown", false, true);
  }
  const parsed = z.object({
    error: z.object({ code: z.number().optional() }).optional(),
    messages: z.array(z.object({ id: z.string() })).optional(),
  }).safeParse(await response.json().catch(() => null));
  const body = parsed.success ? parsed.data : null;
  if (!response.ok) {
    const code = typeof body?.error?.code === "number" ? `meta_${body.error.code}` : `http_${response.status}`;
    const throttled = [4, 17, 130429, 131056].includes(body?.error?.code ?? -1);
    throw new WhatsAppSendError(code, throttled || response.status === 429 || response.status >= 500);
  }
  const id = body?.messages?.[0]?.id;
  if (typeof id !== "string" || !id) throw new WhatsAppSendError("delivery_unknown", false, true);
  return id;
}

export function validWhatsAppSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"));
}

export function validWebhookToken(value: string | null): boolean {
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!value || !expected) return false;
  const a = Buffer.from(value), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
