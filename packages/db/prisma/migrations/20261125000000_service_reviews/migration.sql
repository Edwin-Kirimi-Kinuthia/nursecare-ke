CREATE TABLE "service_reviews" (
  "id" UUID NOT NULL,
  "service_type" TEXT NOT NULL CHECK (service_type IN ('vendor_order','home_visit','lab_order','ambulance')),
  "subject_id" UUID NOT NULL,
  "patient_id" UUID NOT NULL REFERENCES users(id),
  "provider_id" UUID REFERENCES provider_profiles(user_id),
  "org_id" UUID REFERENCES organizations(id),
  "rating" INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  "comment" TEXT,
  "is_visible" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "service_reviews_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "service_reviews_service_type_subject_id_key" ON "service_reviews"("service_type", "subject_id");
CREATE INDEX "service_reviews_provider_id_is_visible_idx" ON "service_reviews"("provider_id", "is_visible");
CREATE INDEX "service_reviews_org_id_is_visible_idx" ON "service_reviews"("org_id", "is_visible");
CREATE INDEX "service_reviews_patient_id_idx" ON "service_reviews"("patient_id");
