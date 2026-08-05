-- CreateEnum
CREATE TYPE "PaymentSubject" AS ENUM ('appointment', 'order', 'home_visit', 'ambulance', 'lab_order');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('jenga_stk', 'jenga_pgw', 'till', 'mpesa_daraja');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('gross_sale', 'platform_fee', 'vendor_payout', 'provider_payout', 'delivery_fee', 'refund', 'payout_settled');

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_provider_id_fkey";

-- DropIndex
DROP INDEX "home_visits_checkout_request_id_key";

-- DropIndex
DROP INDEX "orders_checkout_request_id_key";

-- DropIndex
DROP INDEX "payments_appointment_id_key";

-- DropIndex
DROP INDEX "payments_checkout_request_id_key";

-- AlterTable
ALTER TABLE "home_visits" DROP COLUMN "checkout_request_id",
DROP COLUMN "merchant_request_id",
DROP COLUMN "mpesa_receipt_number",
DROP COLUMN "paid_at",
DROP COLUMN "payment_fail_reason";

-- AlterTable
ALTER TABLE "ledger_entries" ADD COLUMN     "org_id" UUID,
ADD COLUMN     "provider_id" UUID,
DROP COLUMN "type",
ADD COLUMN     "type" "LedgerEntryType" NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "checkout_request_id",
DROP COLUMN "failure_reason",
DROP COLUMN "merchant_request_id",
DROP COLUMN "mpesa_receipt_number",
DROP COLUMN "paid_at";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "appointment_id",
DROP COLUMN "checkout_request_id",
DROP COLUMN "merchant_request_id",
DROP COLUMN "mpesa_receipt_number",
ADD COLUMN     "commission_percent_snapshot" INTEGER NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'KES',
ADD COLUMN     "gateway" "PaymentGateway" NOT NULL DEFAULT 'mpesa_daraja',
ADD COLUMN     "gateway_ref" TEXT NOT NULL,
ADD COLUMN     "gateway_txn_ref" TEXT,
ADD COLUMN     "org_id" UUID,
ADD COLUMN     "raw_init_response" JSONB,
ADD COLUMN     "receipt_number" TEXT,
ADD COLUMN     "refunded_kes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subject_id" UUID NOT NULL,
ADD COLUMN     "subject_type" "PaymentSubject" NOT NULL,
ALTER COLUMN "provider_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL,
    "payment_id" UUID,
    "source" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature_valid" BOOLEAN NOT NULL DEFAULT false,
    "dedupe_key" TEXT NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "org_id" UUID,
    "provider_id" UUID,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "amount_kes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "method" TEXT,
    "reference" TEXT,
    "processed_by" UUID,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_dedupe_key_key" ON "payment_events"("dedupe_key");

-- CreateIndex
CREATE INDEX "payment_events_payment_id_idx" ON "payment_events"("payment_id");

-- CreateIndex
CREATE INDEX "payouts_org_id_status_idx" ON "payouts"("org_id", "status");

-- CreateIndex
CREATE INDEX "payouts_provider_id_status_idx" ON "payouts"("provider_id", "status");

-- CreateIndex
CREATE INDEX "ledger_entries_org_id_type_idx" ON "ledger_entries"("org_id", "type");

-- CreateIndex
CREATE INDEX "ledger_entries_provider_id_type_idx" ON "ledger_entries"("provider_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "payments_gateway_ref_key" ON "payments"("gateway_ref");

-- CreateIndex
CREATE INDEX "payments_subject_type_subject_id_idx" ON "payments"("subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "payments_org_id_status_idx" ON "payments"("org_id", "status");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

