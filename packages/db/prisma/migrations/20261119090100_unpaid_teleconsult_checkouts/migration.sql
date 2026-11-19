-- Unpaid legacy appointments become checkouts, never provider bookings.
-- Keep clinical records and provider-authorised free meetings intact.
UPDATE "appointments" a SET "status" = 'awaiting_payment', "updated_at" = NOW()
WHERE a."appointment_type" = 'teleconsult'
  AND a."status" IN ('requested', 'confirmed')
  AND NOT a."payment_waived" AND a."fee_kes" > 0
  AND NOT EXISTS (SELECT 1 FROM "payments" p WHERE p."subject_type" = 'appointment' AND p."subject_id" = a."id" AND p."status" = 'completed')
  AND NOT EXISTS (SELECT 1 FROM "consultations" c WHERE c."appointment_id" = a."id" AND c."status" IN ('active', 'ended'));
