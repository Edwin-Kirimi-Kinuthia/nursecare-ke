-- Marks an anonymised (self-deleted) account. Additive; existing users are NULL.
ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);
