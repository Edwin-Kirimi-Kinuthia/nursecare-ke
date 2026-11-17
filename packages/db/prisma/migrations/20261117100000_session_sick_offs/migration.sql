CREATE TABLE "sick_offs" (
  "id" UUID NOT NULL,
  "consultation_id" UUID NOT NULL,
  "patient_name" TEXT NOT NULL,
  "provider_name" TEXT NOT NULL,
  "licence_number" TEXT NOT NULL,
  "licence_body" TEXT NOT NULL,
  "assessed_at" TIMESTAMPTZ(6) NOT NULL,
  "from_date" DATE NOT NULL,
  "through_date" DATE NOT NULL,
  "advice" TEXT,
  "signature_data_url" TEXT NOT NULL,
  "stamp_data_url" TEXT,
  "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sick_offs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sick_offs_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "sick_offs_consultation_id_issued_at_idx" ON "sick_offs"("consultation_id", "issued_at");
