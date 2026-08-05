import { db } from "@carebora/db";
import { ApiError, type UserRole } from "@carebora/shared";

/**
 * Every read of a patient's medical record goes through this — no exceptions.
 * Access is granted if:
 *   1. The actor IS the patient.
 *   2. The actor is a provider with a confirmed/completed appointment with this
 *      patient (an active or past care relationship).
 *   3. The actor holds a live RecordAccessGrant from the patient.
 *   4. The actor is an admin AND supplies an explicit reason ("break glass") —
 *      always logged, never silent.
 * Every outcome — granted, denied, or break-glass — is written to
 * RecordAccessLog. This is the single choke point; do not bypass it.
 */
export async function assertCanRead(
  patientId: string,
  actor: { sub: string; role: UserRole },
  opts?: { reason?: string },
): Promise<void> {
  if (actor.sub === patientId) {
    await logAccess(patientId, actor.sub, "view");
    return;
  }

  if (actor.role === "admin") {
    if (!opts?.reason?.trim()) {
      throw ApiError.badRequest("Admin access to a patient record requires an explicit reason");
    }
    await logAccess(patientId, actor.sub, "break_glass", opts.reason);
    return;
  }

  const hasCareRelationship = await db.appointment.findFirst({
    where: { patientId, providerId: actor.sub, status: { in: ["confirmed", "completed"] } },
    select: { id: true },
  });
  if (hasCareRelationship) {
    await logAccess(patientId, actor.sub, "view");
    return;
  }

  const grant = await db.recordAccessGrant.findFirst({
    where: {
      patientId,
      granteeUserId: actor.sub,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  if (grant) {
    await logAccess(patientId, actor.sub, "view");
    return;
  }

  await logAccess(patientId, actor.sub, "denied");
  throw ApiError.forbidden("You do not have access to this patient's record");
}

async function logAccess(patientId: string, actorId: string, action: "view" | "denied" | "break_glass", reason?: string) {
  await db.recordAccessLog.create({ data: { patientId, actorId, action, reason: reason ?? null } });
}
