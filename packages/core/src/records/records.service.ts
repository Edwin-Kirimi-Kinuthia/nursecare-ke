import { db } from "@carebora/db";
import {
  ApiError,
  type CreateAllergyInput,
  type PatchAllergyInput,
  type CreateConditionInput,
  type PatchConditionInput,
  type CreateMedicationEntryInput,
  type PatchMedicationEntryInput,
  type CreateVitalSignInput,
  type CreateImmunizationInput,
  type CreateMedicalDocumentInput,
  type GrantAccessInput,
  type UserRole,
} from "@carebora/shared";
import { assertCanRead } from "./access";
import { putFile } from "../storage/storage";
import { consultationService } from "../consultation/consultation.service";

/**
 * The full patient record — every EMR entity plus the existing consultation/
 * prescription history — gated by assertCanRead. This is the one place a
 * provider, a granted org, or the patient themselves views the whole picture.
 */
async function getRecord(patientId: string, actor: { sub: string; role: UserRole }, reason?: string) {
  await assertCanRead(patientId, actor, { reason });

  const [allergies, conditions, medications, vitals, immunizations, documents, consultations] = await Promise.all([
    db.allergy.findMany({ where: { patientId, isActive: true }, orderBy: { notedAt: "desc" } }),
    db.condition.findMany({ where: { patientId }, orderBy: { createdAt: "desc" } }),
    db.medicationEntry.findMany({ where: { patientId }, orderBy: { createdAt: "desc" } }),
    db.vitalSign.findMany({ where: { patientId }, orderBy: { recordedAt: "desc" }, take: 100 }),
    db.immunization.findMany({ where: { patientId }, orderBy: { administeredAt: "desc" } }),
    db.medicalDocument.findMany({ where: { patientId }, orderBy: { createdAt: "desc" } }),
    consultationService.listForPatient(patientId),
  ]);

  return { allergies, conditions, medications, vitals, immunizations, documents, consultations };
}

/** Only the patient may write to their own EMR entries (self-reported) — providers add
 *  vitals/documents during a consultation via the consultation-scoped write below. */
function assertSelf(patientId: string, userId: string) {
  if (patientId !== userId) throw ApiError.forbidden("You can only manage your own record");
}

export const recordsService = {
  getRecord,

  async createAllergy(patientId: string, userId: string, input: CreateAllergyInput) {
    assertSelf(patientId, userId);
    return db.allergy.create({ data: { patientId, ...input } });
  },
  async patchAllergy(patientId: string, userId: string, allergyId: string, input: PatchAllergyInput) {
    assertSelf(patientId, userId);
    const row = await db.allergy.findFirst({ where: { id: allergyId, patientId } });
    if (!row) throw ApiError.notFound("Allergy not found");
    return db.allergy.update({ where: { id: allergyId }, data: input });
  },

  async createCondition(patientId: string, userId: string, input: CreateConditionInput) {
    assertSelf(patientId, userId);
    return db.condition.create({
      data: { patientId, ...input, diagnosedAt: input.diagnosedAt ? new Date(input.diagnosedAt) : null },
    });
  },
  async patchCondition(patientId: string, userId: string, conditionId: string, input: PatchConditionInput) {
    assertSelf(patientId, userId);
    const row = await db.condition.findFirst({ where: { id: conditionId, patientId } });
    if (!row) throw ApiError.notFound("Condition not found");
    return db.condition.update({
      where: { id: conditionId },
      data: { ...input, diagnosedAt: input.diagnosedAt ? new Date(input.diagnosedAt) : undefined },
    });
  },

  async createMedication(patientId: string, userId: string, input: CreateMedicationEntryInput) {
    assertSelf(patientId, userId);
    return db.medicationEntry.create({
      data: { patientId, ...input, startedAt: input.startedAt ? new Date(input.startedAt) : new Date() },
    });
  },
  async patchMedication(patientId: string, userId: string, entryId: string, input: PatchMedicationEntryInput) {
    assertSelf(patientId, userId);
    const row = await db.medicationEntry.findFirst({ where: { id: entryId, patientId } });
    if (!row) throw ApiError.notFound("Medication entry not found");
    return db.medicationEntry.update({
      where: { id: entryId },
      data: { ...input, endedAt: input.endedAt ? new Date(input.endedAt) : undefined },
    });
  },

  /** Providers may add a vital during a consultation with this patient; patients may self-log. */
  async createVital(patientId: string, actor: { sub: string; role: UserRole }, input: CreateVitalSignInput) {
    if (actor.sub !== patientId) {
      await assertCanRead(patientId, actor); // must have a care relationship or grant
    }
    return db.vitalSign.create({
      data: {
        patientId,
        recordedById: actor.sub,
        type: input.type,
        value: input.value,
        unit: input.unit ?? null,
        consultationId: input.consultationId ?? null,
        recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
      },
    });
  },

  async createImmunization(patientId: string, userId: string, input: CreateImmunizationInput) {
    assertSelf(patientId, userId);
    return db.immunization.create({
      data: {
        patientId, vaccine: input.vaccine, doseNumber: input.doseNumber ?? null,
        administeredBy: input.administeredBy ?? null,
        administeredAt: new Date(input.administeredAt),
        nextDueAt: input.nextDueAt ? new Date(input.nextDueAt) : null,
      },
    });
  },

  /** Patient uploads their own document, or a provider/lab attaches one during a consultation/result. */
  async uploadDocument(patientId: string, actor: { sub: string; role: UserRole }, input: CreateMedicalDocumentInput) {
    if (actor.sub !== patientId) {
      await assertCanRead(patientId, actor);
    }
    const stored = await putFile("medical_document", input.fileUrl);
    return db.medicalDocument.create({
      data: {
        patientId, uploadedById: actor.sub, type: input.type, title: input.title,
        fileUrl: stored.url, consultationId: input.consultationId ?? null,
      },
    });
  },

  // ── Consent (access grants) ────────────────────────────────────────────────

  async listGrants(patientId: string, userId: string) {
    assertSelf(patientId, userId);
    return db.recordAccessGrant.findMany({
      where: { patientId, revokedAt: null },
      include: { granteeUser: { select: { id: true, fullName: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async grantAccess(patientId: string, userId: string, input: GrantAccessInput) {
    assertSelf(patientId, userId);
    const grantee = await db.user.findUnique({ where: { email: input.granteeEmail } });
    if (!grantee) throw ApiError.notFound("No CareBora account with that email");
    if (grantee.id === patientId) throw ApiError.badRequest("You already have access to your own record");
    return db.recordAccessGrant.create({
      data: {
        patientId, granteeUserId: grantee.id, scope: input.scope,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
      include: { granteeUser: { select: { id: true, fullName: true, email: true, role: true } } },
    });
  },

  async revokeAccess(patientId: string, userId: string, grantId: string) {
    assertSelf(patientId, userId);
    const grant = await db.recordAccessGrant.findFirst({ where: { id: grantId, patientId } });
    if (!grant) throw ApiError.notFound("Grant not found");
    return db.recordAccessGrant.update({ where: { id: grantId }, data: { revokedAt: new Date() } });
  },

  /** The patient's own audit trail of who has read their record. */
  async listAccessLog(patientId: string, userId: string) {
    assertSelf(patientId, userId);
    return db.recordAccessLog.findMany({
      where: { patientId },
      include: { actor: { select: { id: true, fullName: true, role: true } } },
      orderBy: { at: "desc" },
      take: 100,
    });
  },
};
