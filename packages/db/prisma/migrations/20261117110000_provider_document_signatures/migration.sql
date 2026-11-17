CREATE TABLE "provider_document_signatures" (
  "provider_id" UUID NOT NULL,
  "signature_data_url" TEXT NOT NULL,
  "authorized_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "provider_document_signatures_pkey" PRIMARY KEY ("provider_id"),
  CONSTRAINT "provider_document_signatures_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);
