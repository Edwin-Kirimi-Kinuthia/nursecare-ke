CREATE TABLE "review_invitations" (
  "id" UUID NOT NULL,
  "subject_type" TEXT NOT NULL,
  "subject_id" UUID NOT NULL,
  "email_sent_at" TIMESTAMPTZ(6),
  "claim_until" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "review_invitations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "review_invitations_subject_type_subject_id_key" ON "review_invitations"("subject_type", "subject_id");
