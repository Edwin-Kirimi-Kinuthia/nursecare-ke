/**
 * Jenga API request signing: RSA-SHA256 over a per-endpoint field concatenation,
 * base64-encoded, sent as the `Signature` header. Each endpoint documents its own
 * concatenation order — callers pass the already-concatenated string.
 */
import { createSign } from "node:crypto";
import { getEnv } from "../../config/env";

function privateKeyPem(): string {
  const b64 = getEnv().JENGA_PRIVATE_KEY_B64;
  if (!b64) throw new Error("JENGA_PRIVATE_KEY_B64 not set");
  return Buffer.from(b64, "base64").toString("utf8");
}

export function signJenga(message: string): string {
  const signer = createSign("RSA-SHA256");
  signer.update(message, "utf8");
  signer.end();
  return signer.sign(privateKeyPem(), "base64");
}
