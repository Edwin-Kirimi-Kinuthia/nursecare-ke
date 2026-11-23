ALTER TABLE "payouts" ADD COLUMN "phone_number" TEXT, ADD COLUMN "request_key" TEXT;
CREATE UNIQUE INDEX "payouts_request_key_key" ON "payouts"("request_key");
CREATE UNIQUE INDEX "payouts_mpesa_reference_key" ON "payouts"("reference") WHERE "method" = 'mpesa' AND "status" = 'paid';
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_positive_amount" CHECK ("amount_kes" > 0);
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_single_payee" CHECK (("org_id" IS NULL) <> ("provider_id" IS NULL));
