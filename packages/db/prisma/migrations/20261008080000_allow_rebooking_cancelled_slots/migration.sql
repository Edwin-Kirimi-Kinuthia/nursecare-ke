-- A slot may have at most one *live* appointment, not one appointment ever.
--
-- appointments.slot_id was UNIQUE outright. Cancelling an appointment frees the
-- slot (slots.is_booked goes false and it reappears to clients), but the
-- cancelled row keeps its slot_id, so the unique index then rejected every
-- later booking of that slot with a unique violation — a cancelled booking
-- permanently killed the time. Cancelled and no-show appointments no longer
-- hold their slot.
--
-- NOTE: Prisma cannot express a partial unique index, so it is not in
-- schema.prisma and `prisma migrate dev` may propose dropping it. Do not accept
-- that; the application depends on it for the rule above.

DROP INDEX "appointments_slot_id_key";

CREATE INDEX "appointments_slot_id_idx" ON "appointments"("slot_id");

CREATE UNIQUE INDEX "appointments_one_live_per_slot"
  ON "appointments"("slot_id")
  WHERE "status" NOT IN ('cancelled', 'no_show');
