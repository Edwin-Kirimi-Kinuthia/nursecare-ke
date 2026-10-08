-- Count guesses against each one-time code so a 6-digit code can't be brute-forced.
-- Additive and safe on live data: existing codes start at 0 attempts.
ALTER TABLE "verification_codes" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- Used to cap how many codes can be requested per account in a time window.
CREATE INDEX "verification_codes_user_id_channel_created_at_idx"
  ON "verification_codes"("user_id", "channel", "created_at");
