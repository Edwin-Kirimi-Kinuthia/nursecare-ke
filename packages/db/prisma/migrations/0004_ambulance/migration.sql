-- CreateEnum
CREATE TYPE "AmbulanceType" AS ENUM ('basic', 'advanced_life_support', 'icu', 'neonatal', 'mortuary');

-- CreateEnum
CREATE TYPE "AmbulanceRequestStatus" AS ENUM ('requested', 'accepted', 'dispatched', 'en_route_pickup', 'arrived_pickup', 'en_route_destination', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "ambulances" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "branch_id" UUID,
    "plate_number" TEXT NOT NULL,
    "type" "AmbulanceType" NOT NULL,
    "crew_size" INTEGER NOT NULL DEFAULT 2,
    "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ambulances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambulance_requests" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "org_id" UUID,
    "ambulance_id" UUID,
    "type" "AmbulanceType" NOT NULL DEFAULT 'basic',
    "urgency" "VisitUrgency" NOT NULL DEFAULT 'urgent',
    "pickup_address" TEXT NOT NULL,
    "pickup_county" TEXT NOT NULL,
    "pickup_latitude" DOUBLE PRECISION NOT NULL,
    "pickup_longitude" DOUBLE PRECISION NOT NULL,
    "pickup_geog" geography(Point,4326),
    "destination_name" TEXT,
    "destination_address" TEXT,
    "patient_condition" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "status" "AmbulanceRequestStatus" NOT NULL DEFAULT 'requested',
    "estimated_kes" INTEGER,
    "fee_kes" INTEGER,
    "accepted_at" TIMESTAMPTZ(6),
    "dispatched_at" TIMESTAMPTZ(6),
    "arrived_pickup_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ambulance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambulance_request_events" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "status" "AmbulanceRequestStatus" NOT NULL,
    "note" TEXT,
    "actor_id" UUID,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ambulance_request_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ambulances_plate_number_key" ON "ambulances"("plate_number");

-- CreateIndex
CREATE INDEX "ambulances_org_id_is_active_is_available_idx" ON "ambulances"("org_id", "is_active", "is_available");

-- CreateIndex
CREATE INDEX "ambulance_requests_patient_id_status_idx" ON "ambulance_requests"("patient_id", "status");

-- CreateIndex
CREATE INDEX "ambulance_requests_org_id_status_idx" ON "ambulance_requests"("org_id", "status");

-- CreateIndex
CREATE INDEX "ambulance_requests_status_created_at_idx" ON "ambulance_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "ambulance_requests_pickup_geog_idx" ON "ambulance_requests" USING GIST ("pickup_geog");

-- CreateIndex
CREATE INDEX "ambulance_request_events_request_id_idx" ON "ambulance_request_events"("request_id");

-- AddForeignKey
ALTER TABLE "ambulances" ADD CONSTRAINT "ambulances_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_requests" ADD CONSTRAINT "ambulance_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_requests" ADD CONSTRAINT "ambulance_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_requests" ADD CONSTRAINT "ambulance_requests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_requests" ADD CONSTRAINT "ambulance_requests_ambulance_id_fkey" FOREIGN KEY ("ambulance_id") REFERENCES "ambulances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_request_events" ADD CONSTRAINT "ambulance_request_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "ambulance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

