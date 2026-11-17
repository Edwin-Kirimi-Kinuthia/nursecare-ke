import { expect, type APIRequestContext } from "@playwright/test";

// Synthetic ink fixture, not a real provider signature.
export const TEST_DOCUMENT_SIGNATURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANwAAABGAQMAAACdaWjnAAAABlBMVEUAAAAMGZGwdUphAAAAAnRSTlMA/1uRIrUAAAFTSURBVHic7ZRBboMwEEUHWbKzsEiXLFC4AksWVbkKR+AAlcrRfBSOkCWLqiQO/h886b5dZISC8fv5noGxRV7xf6OZMHLhCX7NGPWLZsV6pexbQzN/Yrh8aOimCzyC07CUMzwmMylYC6bc/b8KdlJM8JBZwVEkwCM+ZDE8rs0jXlkE6u+3KmdxwZYePocx1YoeVkGBPnqot2C3GhI0OfQCM5MEChp6oOQUFfW/wJbQp3IU3PQVHxkDf3Z4AgyELRU5bKk4UcFc3gj9cWHDejYP+wy9ZMWiHqugoQfWeEjMnkMODT1i//Htb1nHL25ZGr9bS7PUIcMBjtRXVLNXBt5SV3aHLgs0GJlEnRgS67gT/N7Z2EM195Dd9wRasTxsNe6mC0WQmZA8CnnnVIksZrd5FAHHR3GFTJYmTa2wl5WnTP+DqcApnjcNZD1m5EyZo9sr/iBuFNZHp6e796YAAAAASUVORK5CYII=';

export async function authorizeDocumentSignature(request: APIRequestContext, token: string) {
  const res = await request.put("/api/v1/providers/me/document-signature", {
    headers: { Authorization: `Bearer ${token}` },
    data: { signatureDataUrl: TEST_DOCUMENT_SIGNATURE, authorize: true },
  });
  expect(res.status()).toBe(200);
}
