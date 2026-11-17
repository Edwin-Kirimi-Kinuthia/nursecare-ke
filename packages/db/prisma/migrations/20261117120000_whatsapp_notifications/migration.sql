ALTER TABLE "consultations" ADD COLUMN "meeting_run" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "whatsapp_preferences" (
  "user_id" UUID NOT NULL PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "phone_number" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "consented_at" TIMESTAMPTZ(6),
  "updated_at" TIMESTAMPTZ(6) NOT NULL
);
CREATE INDEX "whatsapp_preferences_phone_number_idx" ON "whatsapp_preferences"("phone_number");
CREATE TABLE "whatsapp_opt_outs" (
  "phone_number" TEXT NOT NULL PRIMARY KEY,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "whatsapp_messages" (
  "id" UUID NOT NULL PRIMARY KEY,
  "event_key" TEXT NOT NULL UNIQUE,
  "recipient_user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
  "to_phone" TEXT NOT NULL,
  "template_key" TEXT NOT NULL,
  "parameters" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "provider_message_id" TEXT UNIQUE,
  "error_code" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL
);
CREATE INDEX "whatsapp_messages_status_available_at_idx" ON "whatsapp_messages"("status", "available_at");
CREATE INDEX "whatsapp_messages_recipient_user_id_idx" ON "whatsapp_messages"("recipient_user_id");
