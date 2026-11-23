ALTER TABLE "payouts"
  ADD COLUMN "gateway" TEXT,
  ADD COLUMN "originator_conversation_id" TEXT,
  ADD COLUMN "conversation_id" TEXT,
  ADD COLUMN "callback_token_hash" TEXT,
  ADD COLUMN "submitted_at" TIMESTAMPTZ(6),
  ADD COLUMN "failure_reason" TEXT,
  ADD COLUMN "result_code" INTEGER;
CREATE UNIQUE INDEX "payouts_originator_conversation_id_key" ON "payouts"("originator_conversation_id");
CREATE UNIQUE INDEX "payouts_conversation_id_key" ON "payouts"("conversation_id");
