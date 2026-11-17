import { expect, type APIRequestContext } from "@playwright/test";
import { randomBytes } from "node:crypto";

export async function payAppointment(request: APIRequestContext, appointmentId: string, patientToken: string, adminToken: string) {
  const patient = { Authorization: `Bearer ${patientToken}` };
  const initiated = await request.post("/api/v1/payments/mpesa/stk", { headers: patient, data: { appointmentId, phoneNumber: "0712345678" } });
  expect(initiated.status()).toBe(202);
  const payment = (await initiated.json()).data;
  const submitted = await request.post("/api/v1/payments/till/submit", { headers: patient, data: { gatewayRef: payment.gatewayRef, code: `E2E${randomBytes(5).toString("hex")}` } });
  expect(submitted.status()).toBe(200);
  const approved = await request.post("/api/v1/admin/payments/verifications", { headers: { Authorization: `Bearer ${adminToken}` }, data: { id: payment.id, approve: true } });
  expect(approved.status()).toBe(200);
  return payment.id as string;
}
