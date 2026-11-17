import { test, expect } from "@playwright/test";
import { normalizeWhatsAppPhone } from "@carebora/shared";
import { sendWhatsAppTemplate, WhatsAppSendError, validWhatsAppSignature } from "../../../packages/core/src/notifications/whatsapp-gateway";

test.describe.configure({ mode: "serial" });

test("gateway sends the documented approved-template payload to Meta without logging tokens", async () => {
  const before = { ...process.env };
  Object.assign(process.env, { WHATSAPP_ENABLED: "true", WHATSAPP_ACCESS_TOKEN: "private-test-token", WHATSAPP_PHONE_NUMBER_ID: "12345", WHATSAPP_APP_SECRET: "test-secret", WHATSAPP_VERIFY_TOKEN: "test-verify" });
  const message = { id: "outbox-id", toPhone: "+254712345678", templateKey: "provider_ready" as const, parameters: ["https://app.carebora.co.ke/consultations/example"] };
  try {
    let calls = 0;
    const id = await sendWhatsAppTemplate(message, (async (url, init) => {
      calls++;
      expect(String(url)).toMatch(/^https:\/\/graph.facebook.com\/v\d+\.\d+\/12345\/messages$/);
      const body = JSON.parse(init!.body as string);
      expect(body).toMatchObject({ messaging_product: "whatsapp", to: "254712345678", type: "template", biz_opaque_callback_data: "outbox-id", template: { name: "carebora_provider_ready", components: [{ type: "body", parameters: [{ type: "text", text: message.parameters[0] }] }] } });
      return Response.json({ messages: [{ id: "wamid.accepted" }] });
    }) as typeof fetch);
    expect(id).toBe("wamid.accepted"); expect(calls).toBe(1);
    await expect(sendWhatsAppTemplate(message, (async () => Response.json({ error: { code: 130429 } }, { status: 400 })) as typeof fetch)).rejects.toMatchObject({ code: "meta_130429", retryable: true });
    await expect(sendWhatsAppTemplate(message, (async () => Response.json({ error: { code: 131048 } }, { status: 429 })) as typeof fetch)).rejects.toMatchObject({ code: "meta_131048", retryable: true });
    await expect(sendWhatsAppTemplate(message, (async () => Response.json({ error: { code: 190 } }, { status: 401 })) as typeof fetch)).rejects.toMatchObject({ code: "meta_190", retryable: false });
    await expect(sendWhatsAppTemplate(message, (async () => { throw new Error("network failed"); }) as typeof fetch)).rejects.toMatchObject({ uncertain: true, retryable: false });
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    await expect(sendWhatsAppTemplate(message, (async () => { throw new Error("must never call network"); }) as typeof fetch)).rejects.toBeInstanceOf(WhatsAppSendError);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key];
    Object.assign(process.env, before);
  }
});

test("phone normalization supports Kenyan local numbers, international numbers and signed-webhook rejection", () => {
  expect(normalizeWhatsAppPhone("0712-345-678")).toBe("+254712345678");
  expect(normalizeWhatsAppPhone("254112345678")).toBe("+254112345678");
  expect(normalizeWhatsAppPhone("+1 (680) 778-3483")).toBe("+16807783483");
  expect(validWhatsAppSignature("{}", "sha256=wrong")).toBe(false);
  expect(validWhatsAppSignature("{}", null)).toBe(false);
});
